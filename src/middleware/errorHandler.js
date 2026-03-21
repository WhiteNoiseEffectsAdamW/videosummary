const DB_ERROR_CODES = new Set(['SQLITE_ERROR', 'SQLITE_CONSTRAINT', '23505', '23503']);

function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  const status = err.status || err.statusCode || 500;

  // Never expose raw DB errors (they contain SQL) to the client
  const isDbError = err.code && DB_ERROR_CODES.has(err.code);
  const message = isDbError
    ? 'A database error occurred. Please try again.'
    : (err.message || 'Internal server error');

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
