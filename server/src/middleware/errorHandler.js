function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const sequelizeErrorName = String(error?.name || "");
  const hasSequelizeErrors = Array.isArray(error?.errors) && error.errors.length > 0;
  const isUniqueConstraintError = sequelizeErrorName === "SequelizeUniqueConstraintError";
  const isSequelizeValidationError = sequelizeErrorName === "SequelizeValidationError" && hasSequelizeErrors;

  const status = error.status
    || (isUniqueConstraintError ? 409 : 0)
    || (isSequelizeValidationError ? 400 : 0)
    || 500;

  const message = (isUniqueConstraintError || isSequelizeValidationError)
    ? (error.errors[0]?.message || error.message || "Validation error")
    : (error.message || "Internal server error");

  if (status >= 500) {
    console.error("Unhandled API error", {
      path: req.originalUrl,
      method: req.method,
      status,
      name: sequelizeErrorName || null,
      message,
      details: error?.details || null,
      validationErrors: hasSequelizeErrors
        ? error.errors.map((item) => ({
            message: item.message,
            path: item.path,
            value: item.value,
            type: item.type,
          }))
        : null,
      stack: error?.stack || null,
    });
  }

  return res.status(status).json({
    success: false,
    error: message,
    details: error.details || undefined,
  });
}

module.exports = errorHandler;

