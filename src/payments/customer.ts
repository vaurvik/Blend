export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (let i = 9; i <= 10; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += Number(value[j]) * (i + 1 - j);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(value[i])) return false;
  }
  return true;
}
