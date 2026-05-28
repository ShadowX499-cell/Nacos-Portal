import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Runs a list of express-validator chains and returns 422 if any fail.
 * Usage: router.post('/path', validate([...rules]), controller)
 */
export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all chains in parallel
    await Promise.all(chains.map((chain) => chain.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : 'unknown',
        message: e.msg as string,
      }));

      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details,
        },
      });
      return;
    }

    next();
  };
}
