/**
 * Format API errors for user-friendly display
 * Handles validation errors (array of objects), string errors, and object errors
 */
export const formatError = (error) => {
  if (!error || !error.response) {
    return "An unexpected error occurred. Please try again.";
  }

  const detail = error.response.data?.detail;

  // Handle array of validation errors (FastAPI validation)
  if (Array.isArray(detail)) {
    return detail.map(err => {
      if (typeof err === 'object' && err.msg) {
        // Format: "field_name: error message"
        const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : '';
        return field ? `${field}: ${err.msg}` : err.msg;
      }
      return typeof err === 'string' ? err : JSON.stringify(err);
    }).join(", ");
  }

  // Handle string errors
  if (typeof detail === 'string') {
    return detail;
  }

  // Handle object errors
  if (typeof detail === 'object' && detail !== null) {
    if (detail.message) return detail.message;
    if (detail.error) return detail.error;
    return JSON.stringify(detail);
  }

  // Fallback
  return error.response.data?.message || error.message || "An error occurred";
};

/**
 * Safe render for React components - prevents "Objects are not valid as a React child" error
 */
export const safeRender = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
