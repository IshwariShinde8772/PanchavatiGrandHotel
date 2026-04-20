export function validateID(idType, value) {
  if (!value) return false;

  const patterns = {
    passport: /^[A-Z][0-9]{7}$/i,
    national_id: /^[0-9A-Za-z-]{8,20}$/,
    driving_license: /^[A-Z0-9-]{8,20}$/i,
    other: /^.{4,30}$/,
  };

  return patterns[idType]?.test(value) ?? true;
}

