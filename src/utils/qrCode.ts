import { generateGroupUrl } from '@/lib/groupConfigs';

export interface QRCodeOptions {
  size?: number;
  format?: 'png' | 'svg';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates a QR code URL for a group configuration
 */
export function generateGroupQRCode(
  groupId: string,
  options: QRCodeOptions = {},
  groupName?: string
): string {
  const { size = 300, format = 'png', errorCorrectionLevel = 'M' } = options;

  const groupUrl = generateGroupUrl(groupId, groupName);

  // Using qr-server.com free API for QR code generation
  const params = new URLSearchParams({
    data: groupUrl,
    size: `${size}x${size}`,
    format: format,
    ecc: errorCorrectionLevel,
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/**
 * Downloads a QR code as an image file
 */
import { safeJson } from '@/utils/safeJson';

export async function downloadGroupQRCode(
  groupId: string,
  filename?: string,
  options: QRCodeOptions = {},
  groupName?: string
): Promise<void> {
  const qrUrl = generateGroupQRCode(groupId, options, groupName);

  try {
    const response = await fetch(qrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch QR code: ${response.status}`);
    }
    
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('QR code blob is empty');
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      filename || `group-${groupId}-qr.${options.format || 'png'}`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download QR code:', error);
    
    // Fallback: open QR code in new tab so user can save manually
    console.log('Opening QR code in new tab as fallback...');
    window.open(qrUrl, '_blank');
    
    throw new Error('Failed to download QR code automatically. Opening in new tab instead.');
  }
}

/**
 * Copies the group URL to clipboard
 */
export async function copyGroupUrlToClipboard(
  groupId: string,
  groupName?: string
): Promise<boolean> {
  const groupUrl = generateGroupUrl(groupId, groupName);

  try {
    await navigator.clipboard.writeText(groupUrl);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);

    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = groupUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      return true;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      return false;
    }
  }
}
