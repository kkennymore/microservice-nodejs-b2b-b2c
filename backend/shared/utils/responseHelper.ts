// Response Helper Utilities

export const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  }

  if (data !== null) {
    response.data = data
  }

  return res.status(statusCode).json(response)
}

export const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  })
}

export const paginatedResponse = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  })
}

export const validationErrorResponse = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors,
    timestamp: new Date().toISOString()
  })
}