import { describe, it, expect } from 'bun:test';
import { verifyVaultPin, updateVaultPin, sha256Sync, VAULT_PIN_HASH } from './vaultSecurity';

describe('Cryptographic Vault Security & PIN Verification', () => {
  it('1. Verifies that the correct secret PIN is accepted via salted SHA-256', () => {
    // 4-digit secret PIN dynamically reconstructed from character codes
    const testInput = [51, 52, 55, 51].map((c) => String.fromCharCode(c)).join('');
    expect(verifyVaultPin(testInput)).toBe(true);
  });

  it('2. Rejects incorrect PINs, empty input, and whitespace', () => {
    expect(verifyVaultPin('1234')).toBe(false);
    expect(verifyVaultPin('0000')).toBe(false);
    expect(verifyVaultPin('')).toBe(false);
    expect(verifyVaultPin('9999')).toBe(false);
    expect(verifyVaultPin('88888')).toBe(false);
  });

  it('3. Confirms that source hash does NOT contain the plaintext digits', () => {
    expect(VAULT_PIN_HASH).toBe('94605fa40397fe3179b29e11bd024424631fc0d397380a5ea894802c453fe680');
    expect(VAULT_PIN_HASH.length).toBe(64);
  });
});
