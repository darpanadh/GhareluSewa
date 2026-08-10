import { body, validationResult } from 'express-validator';

// Rules for the registration route
export const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 70 }).withMessage('Full name must be between 2 and 70 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is compulsory for registration')
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits (e.g. 98XXXXXXXX)'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Middleware to check results and stop the request if invalid
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstErrorMessage = errors.array()[0]?.msg || 'Validation failed';
    return res.status(400).json({
      success: false,
      error: firstErrorMessage,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};