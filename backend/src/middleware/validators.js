import { body, validationResult } from 'express-validator';

// Rules for the registration route
export const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2 }).withMessage('at least 2 characters required')
    .matches(/^[A-Za-z\s]+$/).withMessage('Full name can only contain letters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i).withMessage('Must be a valid @gmail.com address'),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Middleware to check results and stop the request if invalid
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};