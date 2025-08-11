/**
 * Parse frequency string to milliseconds
 * @param frequency - Frequency string like "30s" or "2m" or "continuous"
 * @returns Number of milliseconds
 */
export const parseFrequencyToMs = (frequency: string): number => {
  const number = parseInt(frequency);
  if (frequency.includes('s')) {
    return number * 1000; // seconds to milliseconds
  } else if (frequency.includes('m')) {
    return number * 60 * 1000; // minutes to milliseconds
  }
  return 10000; // default 10 seconds
};

/**
 * Check if enough time has passed based on recording frequency
 * @param lastRecordedTime - Last time data was recorded (epoch ms)
 * @param frequencyMs - Frequency in milliseconds
 * @returns Whether enough time has passed
 */
export const shouldRecordData = (
  lastRecordedTime: number | Date | null,
  frequencyMs: number
): boolean => {
  if (!lastRecordedTime) return true;

  const lastTime = typeof lastRecordedTime === 'number' 
    ? lastRecordedTime 
    : lastRecordedTime.getTime();
  const currentTime = Date.now();
  return currentTime - lastTime >= frequencyMs;
};
