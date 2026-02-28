/**
 * PromptPay QR Payload Generator (EMVCo Standard)
 * Based on the PromptPay Specification for Thailand
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function f(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

/**
 * Generates a PromptPay QR payload string
 * @param target The PromptPay ID (Phone number starting with 0, or National ID)
 * @param amount The bill amount (optional)
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  // Clean target
  target = target.replace(/[^0-9]/g, '');
  
  // Format for Phone number (if starts with 0)
  // Standard format: 0066 + phone number without leading 0
  let formattedTarget = target;
  if (target.length === 10 && target.startsWith('0')) {
    formattedTarget = '0066' + target.substring(1);
  }

  // Segment 29: Merchant Account Information (PromptPay)
  // AID for PromptPay is 00000000000000
  const aid = f('00', 'A000000677010111'); // PromptPay AID
  const merchantInfo = f('00', 'A000000677010111') + 
                       (target.length > 10 ? f('02', formattedTarget) : f('01', formattedTarget));
  
  let payload = '';
  payload += f('00', '01'); // Payload Format Indicator
  payload += f('01', amount ? '12' : '11'); // Point of Initiation Method (12 = Dynamic, 11 = Static)
  payload += f('29', merchantInfo);
  payload += f('53', '764'); // Transaction Currency (THB)
  
  if (amount) {
    payload += f('54', amount.toFixed(2));
  }
  
  payload += f('58', 'TH'); // Country Code
  payload += '6304'; // CRC Identifier and Length
  
  return payload + crc16(payload);
}
