export function normalizeWhatsAppNumber(value, countryCode = '94') {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `${countryCode}${digits.slice(1)}`;
  digits = digits.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function staffWhatsAppUrl(mobileNumber, text) {
  const number = normalizeWhatsAppNumber(mobileNumber);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
