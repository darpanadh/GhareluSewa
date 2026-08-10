export function validateRegisterForm({ firstName, lastName, name, email, password }) {
  const errors = {};

  const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();
  if (!fullName) {
    errors.name = 'Full name is required';
  } else if (fullName.length < 2 || fullName.length > 70) {
    errors.name = 'Full name must be between 2 and 70 characters';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else {
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(password)) errors.password = 'Add at least one uppercase letter';
    else if (!/[a-z]/.test(password)) errors.password = 'Add at least one lowercase letter';
    else if (!/[0-9]/.test(password)) errors.password = 'Add at least one number';
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.password = 'Add at least one special character';
  }

  return errors;
}