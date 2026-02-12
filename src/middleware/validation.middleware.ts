import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors: { [key: string]: string }[] = [];
    errors.array().map((err: any) => {
      extractedErrors.push({ [err.path]: err.msg });
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: extractedErrors,
    });
  };
};