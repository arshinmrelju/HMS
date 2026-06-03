const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    if (schema.body && req.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required.`);
          continue;
        }
        if (value !== undefined && value !== null && value !== '') {
          if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`${field} must be a valid email.`);
          }
          if (rules.type === 'number' && isNaN(Number(value))) {
            errors.push(`${field} must be a number.`);
          }
          if (rules.minLength && String(value).length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters.`);
          }
          if (rules.maxLength && String(value).length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters.`);
          }
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
          }
        }
      }
    }
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }
    next();
  };
};

module.exports = { validate };
