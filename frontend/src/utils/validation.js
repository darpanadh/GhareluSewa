export function evaluatePasswordStrength(password = '') {
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  let rating = 'Too Short';
  let color = 'bg-gray-400';
  let percent = 0;

  if (password.length > 0) {
    if (score <= 1) {
      rating = 'Weak 🔴';
      color = 'bg-red-500';
      percent = 25;
    } else if (score <= 2) {
      rating = 'Fair 🟡';
      color = 'bg-amber-500';
      percent = 50;
    } else if (score === 3) {
      rating = 'Good 🔵';
      color = 'bg-sky-500';
      percent = 75;
    } else {
      rating = 'Strong 🟢';
      color = 'bg-emerald-500';
      percent = 100;
    }
  }

  return { checks, score, rating, color, percent };
}

export function validateRegisterForm(data = {}) {
  const errors = {};

  const nameVal = (data.name || data.firstName || '').trim();

  if (!nameVal || nameVal.length < 2) {
    errors.name = 'at least 2 characters required';
    errors.firstName = 'at least 2 characters required';
  } else if (!/^[A-Za-z\s]+$/.test(nameVal)) {
    errors.name = 'Full name can only contain letters';
    errors.firstName = 'First name can only contain letters';
  }

  if (data.lastName !== undefined) {
    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.lastName = 'at least 2 characters required';
    } else if (!/^[A-Za-z\s]+$/.test(data.lastName.trim())) {
      errors.lastName = 'Last name can only contain letters';
    }
  }

  const emailVal = (data.email || '').trim();
  if (!emailVal || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailVal)) {
    errors.email = 'Must be a valid @gmail.com address';
  }

  const phoneVal = (data.phone || '').trim();
  if (phoneVal && !/^\d{10}$/.test(phoneVal)) {
    errors.phone = 'Phone number must be exactly 10 digits';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = 'Add at least one capital letter (A-Z)';
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
    errors.password = 'Add at least one special character (!@#$)';
  }

  return errors;
}