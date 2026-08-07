export function validateRegisterForm({ firstName, lastName, email, password }) {
  const errors = {};

  if (!firstName || firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (!/^[A-Za-z\s]+$/.test(firstName)) {
    errors.firstName = 'First name can only contain letters';
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (!/^[A-Za-z\s]+$/.test(lastName)) {
    errors.lastName = 'Last name can only contain letters';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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