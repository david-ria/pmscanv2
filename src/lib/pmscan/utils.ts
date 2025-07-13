export function exponentialBackoff(
  max: number,
  delay: number,
  toTry: () => Promise<any>,
  success: (result: any) => void,
  fail: () => void
): void {
  toTry()
    .then(result => success(result))
    .catch(_ => {
      if (max === 0) {
        return fail();
      }
      console.log(`🔄 Retrying in ${delay}s... (${max} tries left)`);
      setTimeout(() => {
        exponentialBackoff(--max, Math.floor(5 + delay), toTry, success, fail);
      }, delay * 1000);
    });
}
