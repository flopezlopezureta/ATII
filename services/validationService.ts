

export const validateRUT = (rutCompleto: string): { isValid: boolean; message?: string } => {
  if (!rutCompleto || typeof rutCompleto !== 'string') {
    return { isValid: false, message: 'RUT no puede estar vacío.' };
  }

  const rutLimpio = rutCompleto.replace(/[^0-9kK]+/g, '').toUpperCase();
  
  if (rutLimpio.length < 2) {
    return { isValid: false, message: 'RUT inválido o demasiado corto.' };
  }

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) {
     return { isValid: false, message: 'Formato de RUT incorrecto (parte numérica debe contener solo dígitos).' };
  }
   if (!/^[\dkK]$/.test(dv)) {
    return { isValid: false, message: 'Formato de RUT incorrecto (dígito verificador inválido).' };
  }


  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalculado: string;

  if (dvEsperado === 11) {
    dvCalculado = '0';
  } else if (dvEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = dvEsperado.toString();
  }

  if (dvCalculado === dv) {
    return { isValid: true };
  } else {
    return { isValid: false, message: 'Dígito verificador incorrecto.' };
  }
};

export const formatRUT = (value: string): string => {
  if (!value) return "";
  const cleaned = value.replace(/[^0-9kK]/gi, '').toUpperCase();
  const len = cleaned.length;

  if (len === 0) return '';

  let rut = cleaned;
  if (len > 1) {
    const dv = cleaned.substring(len - 1);
    const body = cleaned.substring(0, len - 1);
    rut = `${body}-${dv}`;
  }
  
  if (len > 4) { // xxx-X -> xxx.x-X (no, this is wrong, should be from the body)
                 // Body length > 3: 1234 -> 1.234
    const parts = rut.split('-');
    let body = parts[0];
    const dv = parts[1] || '';

    if (body.length > 3) {
      body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    rut = dv ? `${body}-${dv}` : body;
  }
  
  return rut;
};

// Helper to get only numbers and K for validation, if needed separately
export const cleanRUT = (rut: string): string => {
  if (!rut) return "";
  return rut.replace(/[^0-9kK]/gi, '').toUpperCase();
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone || !phone.trim()) {
    return '';
  }
  const trimmed = phone.trim();
  if (trimmed.startsWith('+56')) {
    return trimmed;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.startsWith('56')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length > 0) {
    return `+56${digitsOnly}`;
  }
  return phone; // Return original if no digits found.
};