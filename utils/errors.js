export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof ApiError) {
    return res.status(err.status).render('error', {
      error: err.message
    });
  }

  res.status(500).render('error', {
    error: 'Internal Server Error'
  });
};
