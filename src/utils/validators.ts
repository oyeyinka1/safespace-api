import { body, param, query } from 'express-validator';

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const submitMessageValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[\d\s\+\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters'),
];

export const sendReplyValidation = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters'),
];

export const conversationIdValidation = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const updateStatusValidation = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('status')
    .isIn(['active', 'resolved', 'archived'])
    .withMessage('Status must be: active, resolved, or archived'),
];