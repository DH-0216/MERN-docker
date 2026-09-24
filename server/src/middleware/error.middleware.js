import config from "../config/env.js";

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Internal server error";

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Resource not found. Invalid identifier: ${err.path}`;
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value entered for ${field}. Please use another value.`;
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Handle Payload Too Large (Express body-parser limit)
  if (err.type === "entity.too.large" || err.status === 413) {
    statusCode = 413;
    message = "Request body exceeds maximum size limit (10kb)";
  }

  // Handle JSON Syntax Error in request body
  if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON payload in request body";
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Authorization denied.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please sign in again.";
  }

  // Hide internal server error details in production
  if (statusCode >= 500 && config.isProduction) {
    console.error("🔴 [SERVER ERROR]", err);
    message = "An unexpected internal server error occurred.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
};
