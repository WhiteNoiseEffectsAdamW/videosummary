import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link to="/" className="legal-back">← Back</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: March 2026</p>

        <h2>What we collect</h2>
        <p>When you create an account we collect your email address, an optional display name, and a bcrypt-hashed password. We never store your password in plain text.</p>
        <p>When you summarize a video we record the YouTube video ID in your save history so you can revisit summaries. We do not store the full video transcript.</p>
        <p>If you follow channels, we store the YouTube channel ID and channel name for each subscription.</p>

        <h2>How we use it</h2>
        <p>Your email is used to log you in and, if you opt in, to send a daily digest of new video summaries from channels you follow. We do not sell or share your data with third parties for marketing purposes.</p>

        <h2>Third-party processors</h2>
        <ul>
          <li><strong>Anthropic</strong> — video transcripts are sent to the Claude API to generate summaries. Anthropic's privacy policy applies to data processed by their API.</li>
          <li><strong>Resend</strong> — used to send digest emails. Your email address is passed to Resend for delivery.</li>
          <li><strong>Railway</strong> — our hosting provider. Your data is stored in a Postgres database on Railway's infrastructure.</li>
        </ul>

        <h2>Data retention</h2>
        <p>Your data is retained for as long as your account is active. You may delete your account at any time from your account settings, which permanently removes your email, save history, and channel subscriptions.</p>

        <h2>Your rights</h2>
        <p>You have the right to access, correct, or delete the personal data we hold about you. To exercise these rights, email us at <a href="mailto:privacy@headwaterapp.com">privacy@headwaterapp.com</a>.</p>
        <p>If you are in the EU/EEA, you have additional rights under GDPR including the right to data portability and the right to lodge a complaint with your local supervisory authority.</p>

        <h2>Cookies</h2>
        <p>We use a single session cookie to keep you logged in. No third-party tracking or advertising cookies are used.</p>

        <h2>Contact</h2>
        <p>Questions? Email <a href="mailto:privacy@headwaterapp.com">privacy@headwaterapp.com</a>.</p>
      </div>
    </div>
  );
}
