import { retryService } from './retry-service.js'
import { logger } from './logger-service.js'

/**
 * Test utility for validating the retry mechanism
 * This file can be used for development testing and validation
 */
export class RetryTestUtility {
  constructor() {
    this.testResults = []
  }

  /**
   * Test the retry mechanism with various error scenarios
   */
  async runTests() {
    console.log('\n=== Starting Retry Service Tests ===')
    this.testResults = []

    // Test 1: Network timeout error (should retry)
    await this.testNetworkTimeout()

    // Test 2: Connection refused error (should retry)
    await this.testConnectionRefused()

    // Test 3: Authentication error (should NOT retry)
    await this.testAuthenticationError()

    // Test 4: Successful operation after retries
    await this.testSuccessAfterRetries()

    // Test 5: DNS error (should retry)
    await this.testDnsError()

    // Test 6: Non-retryable validation error
    await this.testValidationError()

    this.printTestResults()
  }

  /**
   * Test network timeout error (retryable)
   */
  async testNetworkTimeout() {
    console.log('\nTest 1: Network timeout error (should retry)')
    
    const testOperation = async () => {
      throw new Error('Network request timeout - ETIMEDOUT')
    }

    try {
      await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 2, minDelay: 1000, maxDelay: 2000 },
        'test-profile-1',
        'network-timeout-test'
      )
      this.testResults.push({ test: 'Network Timeout', result: 'UNEXPECTED_SUCCESS' })
    } catch (error) {
      const shouldRetry = retryService.isRetryableError(error)
      this.testResults.push({ 
        test: 'Network Timeout', 
        result: shouldRetry ? 'PASS' : 'FAIL',
        message: `Retryable: ${shouldRetry}, Error: ${error.message}`
      })
    }
  }

  /**
   * Test connection refused error (retryable)
   */
  async testConnectionRefused() {
    console.log('\nTest 2: Connection refused error (should retry)')
    
    const testOperation = async () => {
      throw new Error('Connection refused - ECONNREFUSED 127.0.0.1:80')
    }

    try {
      await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 1, minDelay: 500, maxDelay: 1000 },
        'test-profile-2',
        'connection-refused-test'
      )
      this.testResults.push({ test: 'Connection Refused', result: 'UNEXPECTED_SUCCESS' })
    } catch (error) {
      const shouldRetry = retryService.isRetryableError(error)
      this.testResults.push({ 
        test: 'Connection Refused', 
        result: shouldRetry ? 'PASS' : 'FAIL',
        message: `Retryable: ${shouldRetry}, Error: ${error.message}`
      })
    }
  }

  /**
   * Test authentication error (should NOT retry)
   */
  async testAuthenticationError() {
    console.log('\nTest 3: Authentication error (should NOT retry)')
    
    const testOperation = async () => {
      throw new Error('Authentication failed - invalid credentials')
    }

    try {
      await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 2, minDelay: 500, maxDelay: 1000 },
        'test-profile-3',
        'auth-error-test'
      )
      this.testResults.push({ test: 'Authentication Error', result: 'UNEXPECTED_SUCCESS' })
    } catch (error) {
      const shouldRetry = retryService.isRetryableError(error)
      this.testResults.push({ 
        test: 'Authentication Error', 
        result: !shouldRetry ? 'PASS' : 'FAIL',
        message: `Retryable: ${shouldRetry}, Error: ${error.message}`
      })
    }
  }

  /**
   * Test successful operation after retries
   */
  async testSuccessAfterRetries() {
    console.log('\nTest 4: Success after retries')
    
    let attemptCount = 0
    const testOperation = async () => {
      attemptCount++
      if (attemptCount <= 2) {
        throw new Error('Network connection timeout')
      }
      return { success: true, message: 'Operation successful' }
    }

    try {
      const result = await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 3, minDelay: 500, maxDelay: 1000 },
        'test-profile-4',
        'success-after-retries-test'
      )
      
      this.testResults.push({ 
        test: 'Success After Retries', 
        result: result.success ? 'PASS' : 'FAIL',
        message: `Attempts: ${attemptCount}, Result: ${result.message}`
      })
    } catch (error) {
      this.testResults.push({ 
        test: 'Success After Retries', 
        result: 'FAIL',
        message: `Failed after ${attemptCount} attempts: ${error.message}`
      })
    }
  }

  /**
   * Test DNS error (retryable)
   */
  async testDnsError() {
    console.log('\nTest 5: DNS error (should retry)')
    
    const testOperation = async () => {
      throw new Error('getaddrinfo ENOTFOUND invalid.domain.com')
    }

    try {
      await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 1, minDelay: 500, maxDelay: 1000 },
        'test-profile-5',
        'dns-error-test'
      )
      this.testResults.push({ test: 'DNS Error', result: 'UNEXPECTED_SUCCESS' })
    } catch (error) {
      const shouldRetry = retryService.isRetryableError(error)
      this.testResults.push({ 
        test: 'DNS Error', 
        result: shouldRetry ? 'PASS' : 'FAIL',
        message: `Retryable: ${shouldRetry}, Error: ${error.message}`
      })
    }
  }

  /**
   * Test validation error (should NOT retry)
   */
  async testValidationError() {
    console.log('\nTest 6: Validation error (should NOT retry)')
    
    const testOperation = async () => {
      throw new Error('Validation failed - invalid input format')
    }

    try {
      await retryService.executeWithRetry(
        testOperation,
        { maxRetries: 2, minDelay: 500, maxDelay: 1000 },
        'test-profile-6',
        'validation-error-test'
      )
      this.testResults.push({ test: 'Validation Error', result: 'UNEXPECTED_SUCCESS' })
    } catch (error) {
      const shouldRetry = retryService.isRetryableError(error)
      this.testResults.push({ 
        test: 'Validation Error', 
        result: !shouldRetry ? 'PASS' : 'FAIL',
        message: `Retryable: ${shouldRetry}, Error: ${error.message}`
      })
    }
  }

  /**
   * Print test results summary
   */
  printTestResults() {
    console.log('\n=== Test Results Summary ===')
    
    const passCount = this.testResults.filter(r => r.result === 'PASS').length
    const totalCount = this.testResults.length
    
    this.testResults.forEach(result => {
      const status = result.result === 'PASS' ? '✅' : '❌'
      console.log(`${status} ${result.test}: ${result.result}`)
      if (result.message) {
        console.log(`   ${result.message}`)
      }
    })
    
    console.log(`\nOverall: ${passCount}/${totalCount} tests passed`)
    
    if (passCount === totalCount) {
      console.log('🎉 All tests passed! Retry mechanism is working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Please review the retry logic.')
    }
  }

  /**
   * Test specific error classification
   */
  testErrorClassification() {
    console.log('\n=== Error Classification Tests ===')
    
    const testCases = [
      { error: new Error('Network timeout'), expected: true, type: 'Network Timeout' },
      { error: new Error('ECONNREFUSED'), expected: true, type: 'Connection Refused' },
      { error: new Error('DNS resolution failed'), expected: true, type: 'DNS Error' },
      { error: new Error('WebSocket connection lost'), expected: true, type: 'WebSocket Error' },
      { error: new Error('Authentication failed'), expected: false, type: 'Auth Error' },
      { error: new Error('Invalid credentials'), expected: false, type: 'Credential Error' },
      { error: new Error('Captcha required'), expected: false, type: 'Captcha Error' },
      { error: new Error('Validation error'), expected: false, type: 'Validation Error' }
    ]
    
    testCases.forEach(testCase => {
      const result = retryService.isRetryableError(testCase.error)
      const status = result === testCase.expected ? '✅' : '❌'
      console.log(`${status} ${testCase.type}: Expected ${testCase.expected}, Got ${result}`)
    })
  }
}

// Export for testing
export const retryTestUtility = new RetryTestUtility()

// Only run if this file is executed directly (for development)
if (import.meta.url === `file://${process.argv[1]}`) {
  retryTestUtility.runTests().then(() => {
    retryTestUtility.testErrorClassification()
  })
}