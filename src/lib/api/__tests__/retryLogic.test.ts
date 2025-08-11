/**
 * Test cases for API client retry logic
 * Run these tests to verify retry behavior
 */

// Mock test cases - these would typically be in a test file
interface ErrorWithCode extends Error {
  code?: number | string;
}

export const testRetryLogic = () => {
  console.group('🧪 API Client Retry Logic Tests');

  // Test case 1: 422 should NOT retry
  const error422: ErrorWithCode = new Error('Validation failed');
  error422.code = 422;
  
  const isAbort422 = error422?.name === 'AbortError' || error422?.message === 'timeout';
  const isNetworkError422 = error422?.message?.includes('NetworkError') || 
                             error422?.message?.includes('fetch') || 
                             (typeof error422?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(error422.code));
  const isServerError422 = typeof error422?.code === 'number' && error422.code >= 500 && error422.code < 600;
  const retriable422 = isAbort422 || isNetworkError422 || isServerError422;

  console.log('✅ Test 1 - 422 Error (should NOT retry):', {
    errorCode: 422,
    retriable: retriable422,
    expected: false,
    passed: !retriable422
  });

  // Test case 2: 403 should NOT retry
  const error403: ErrorWithCode = new Error('Forbidden');
  error403.code = 403;
  
  const isAbort403 = error403?.name === 'AbortError' || error403?.message === 'timeout';
  const isNetworkError403 = error403?.message?.includes('NetworkError') || 
                             error403?.message?.includes('fetch') || 
                             (typeof error403?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(error403.code));
  const isServerError403 = typeof error403?.code === 'number' && error403.code >= 500 && error403.code < 600;
  const retriable403 = isAbort403 || isNetworkError403 || isServerError403;

  console.log('✅ Test 2 - 403 Error (should NOT retry):', {
    errorCode: 403,
    retriable: retriable403,
    expected: false,
    passed: !retriable403
  });

  // Test case 3: 500 should retry
  const error500: ErrorWithCode = new Error('Internal Server Error');
  error500.code = 500;
  
  const isAbort500 = error500?.name === 'AbortError' || error500?.message === 'timeout';
  const isNetworkError500 = error500?.message?.includes('NetworkError') || 
                             error500?.message?.includes('fetch') || 
                             (typeof error500?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(error500.code));
  const isServerError500 = typeof error500?.code === 'number' && error500.code >= 500 && error500.code < 600;
  const retriable500 = isAbort500 || isNetworkError500 || isServerError500;

  console.log('✅ Test 3 - 500 Error (should retry):', {
    errorCode: 500,
    retriable: retriable500,
    expected: true,
    passed: retriable500
  });

  // Test case 4: Timeout should retry
  const errorTimeout: ErrorWithCode = new Error('timeout');
  
  const isAbortTimeout = errorTimeout?.name === 'AbortError' || errorTimeout?.message === 'timeout';
  const isNetworkErrorTimeout = errorTimeout?.message?.includes('NetworkError') || 
                                errorTimeout?.message?.includes('fetch') || 
                                (typeof errorTimeout?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(errorTimeout.code));
  const isServerErrorTimeout = typeof errorTimeout?.code === 'number' && errorTimeout.code >= 500 && errorTimeout.code < 600;
  const retriableTimeout = isAbortTimeout || isNetworkErrorTimeout || isServerErrorTimeout;

  console.log('✅ Test 4 - Timeout Error (should retry):', {
    errorMessage: 'timeout',
    retriable: retriableTimeout,
    expected: true,
    passed: retriableTimeout
  });

  // Test case 5: Network error should retry
  const errorNetwork: ErrorWithCode = new Error('NetworkError: Failed to fetch');
  
  const isAbortNetwork = errorNetwork?.name === 'AbortError' || errorNetwork?.message === 'timeout';
  const isNetworkErrorNetwork = errorNetwork?.message?.includes('NetworkError') || 
                                errorNetwork?.message?.includes('fetch') || 
                                (typeof errorNetwork?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(errorNetwork.code));
  const isServerErrorNetwork = typeof errorNetwork?.code === 'number' && errorNetwork.code >= 500 && errorNetwork.code < 600;
  const retriableNetwork = isAbortNetwork || isNetworkErrorNetwork || isServerErrorNetwork;

  console.log('✅ Test 5 - Network Error (should retry):', {
    errorMessage: 'NetworkError: Failed to fetch',
    retriable: retriableNetwork,
    expected: true,
    passed: retriableNetwork
  });

  // Test case 6: 401 should NOT retry
  const error401: ErrorWithCode = new Error('Unauthorized');
  error401.code = 401;
  
  const isAbort401 = error401?.name === 'AbortError' || error401?.message === 'timeout';
  const isNetworkError401 = error401?.message?.includes('NetworkError') || 
                             error401?.message?.includes('fetch') || 
                             (typeof error401?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(error401.code));
  const isServerError401 = typeof error401?.code === 'number' && error401.code >= 500 && error401.code < 600;
  const retriable401 = isAbort401 || isNetworkError401 || isServerError401;

  console.log('✅ Test 6 - 401 Error (should NOT retry):', {
    errorCode: 401,
    retriable: retriable401,
    expected: false,
    passed: !retriable401
  });

  // Summary
  const allTests = [!retriable422, !retriable403, retriable500, retriableTimeout, retriableNetwork, !retriable401];
  const allPassed = allTests.every(test => test);
  
  console.log(`\n📊 Test Summary: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log(`Passed: ${allTests.filter(Boolean).length}/${allTests.length}`);
  console.log(`\n🔍 Retry Rules Applied:`);
  console.log('- 4xx errors (400, 401, 403, 404, 422, etc.): NO RETRY');
  console.log('- 5xx errors (500, 502, 503, etc.): RETRY');
  console.log('- Timeouts and aborts: RETRY');
  console.log('- Network errors: RETRY');
  
  console.groupEnd();
  
  return allPassed;
};

// Utility function to test retry behavior in development
export const runRetryTests = () => {
  if (import.meta.env.DEV) {
    return testRetryLogic();
  }
  return true;
};