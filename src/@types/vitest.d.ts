import type {
  Assertion as VitestAssertion,
  AsymmetricMatchersContaining as VitestAsymmetricMatchersContaining,
} from 'vitest';

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends VitestAssertion<T>, CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends VitestAsymmetricMatchersContaining, CustomMatchers {}
}
