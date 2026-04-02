const router = require('express').Router();
const Stripe = require('stripe');
const requireAuth = require('../middleware/requireAuth');
const { findById, findByStripeCustomerId, setStripeCustomer, setSubscriptionStatus } = require('../models/user');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const user = await findById(req.user.id);

    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user.id) } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/upgrade?success=true`,
      cancel_url: `${APP_URL}/upgrade`,
      metadata: { userId: String(req.user.id) },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal — create Stripe billing portal session
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const user = await findById(req.user.id);
    if (!user.stripe_customer_id) return res.status(400).json({ error: 'No billing account found.' });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}/account`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/status — get current subscription status
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const user = await findById(req.user.id);
    res.json({ subscriptionStatus: user.subscription_status || 'free' });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — Stripe webhook (no auth, raw body)
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body);
  } catch (err) {
    console.error('[billing] webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId, 10);
        if (!userId) break;
        await setStripeCustomer(userId, {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          subscriptionStatus: 'pro',
        });
        console.log(`[billing] user ${userId} upgraded to Pro`);
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub = event.data.object;
        const user = await findByStripeCustomerId(sub.customer);
        if (!user) break;
        await setSubscriptionStatus(user.id, 'free');
        console.log(`[billing] user ${user.id} downgraded to free (${event.type})`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = await findByStripeCustomerId(sub.customer);
        if (!user) break;
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free';
        await setSubscriptionStatus(user.id, status);
        console.log(`[billing] user ${user.id} subscription updated → ${status} (stripe status: ${sub.status})`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[billing] webhook handler error:', err.message);
  }

  res.json({ received: true });
});

module.exports = router;
