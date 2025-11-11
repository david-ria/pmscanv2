import { generateGroupUrl } from '@/lib/groupConfigs';
import QRCode from 'qrcode';

export interface QRCodeOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates a QR code as a data URL (client-side, no external API)
 */
export async function generateGroupQRCodeDataURL(
  groupId: string,
  options: QRCodeOptions = {},
  groupName?: string
): Promise<string> {
  const { size = 300, errorCorrectionLevel = 'M' } = options;
  const groupUrl = generateGroupUrl(groupId, groupName);

  try {
    const dataUrl = await QRCode.toDataURL(groupUrl, {
      width: size,
      errorCorrectionLevel: errorCorrectionLevel,
      margin: 2,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Downloads a QR code as an image file using client-side generation
 */

export async function downloadGroupQRCode(
  groupId: string,
  filename?: string,
  options: QRCodeOptions = {},
  groupName?: string
): Promise<void> {
  try {
    // Generate QR code as data URL
    const dataUrl = await generateGroupQRCodeDataURL(groupId, options, groupName);
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `group-${groupId}-qr.png`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download QR code:', error);
    throw error;
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
