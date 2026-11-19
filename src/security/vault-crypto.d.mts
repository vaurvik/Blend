export interface EncryptedSecret {
  version: number;
  nonce: string;
  ciphertext: string;
  tag: string;
}
export function encryptSecret(
  key: Buffer,
  value: string,
  context: string,
): EncryptedSecret;
export function decryptSecret(
  key: Buffer,
  record: EncryptedSecret,
  context: string,
): string;
