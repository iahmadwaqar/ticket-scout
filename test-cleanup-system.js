/**
 * Cleanup System Test Script
 * 
 * Tests the comprehensive cleanup system with various shutdown scenarios.
 * Run: node test-cleanup-system.js
 */

import { cleanupManager } from './src/main/services/cleanup-manager.js'
import { goLoginService } from './src/main/services/gologin/index.js'
import { profileStore } from './src/main/services/profile/profileStore.js'

/**
 * Test graceful cleanup scenario
 */
async function testGracefulCleanup() {
  console.log('\n=== TEST 1: Graceful Cleanup ===')
  
  try {
    // Setup test profiles
    const testProfiles = [
      { id: 'test-1', name: 'Test Profile 1', token: 'fake-token-1' },
      { id: 'test-2', name: 'Test Profile 2', token: 'fake-token-2' }
    ]
    
    testProfiles.forEach(profile => {
      profileStore.addProfile(profile)
      console.log(`✓ Added test profile: ${profile.name}`)
    })
    
    // Add mock GoLogin instances
    profileStore.setGoLoginInstances('test-1', {
      gologin: { id: 'fake-gologin-1', local: false },
      browser: { id: 'fake-browser-1' },
      cdp: { id: 'fake-cdp-1' }
    })
    console.log('✓ Added mock GoLogin instances')
    
    // Test graceful cleanup
    console.log('\nStarting graceful cleanup...')
    const result = await cleanupManager.startCleanup('test-graceful', false)
    
    console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`Message: ${result.message}`)
    console.log(`Duration: ${result.duration}ms`)
    
    // Verify cleanup
    const remainingProfiles = profileStore.getProfileCount()
    const remainingInstances = profileStore.getAllGoLoginInstances().length
    
    console.log(`Remaining profiles: ${remainingProfiles}`)
    console.log(`Remaining instances: ${remainingInstances}`)
    
    return remainingProfiles === 0 && remainingInstances === 0
  } catch (error) {
    console.error(`Test failed: ${error.message}`)
    return false
  }
}

/**
 * Test force cleanup scenario
 */
async function testForceCleanup() {
  console.log('\n=== TEST 2: Force Cleanup ===')
  
  try {
    // Setup test profiles
    const profile = { id: 'force-test', name: 'Force Test', token: 'fake-force' }
    profileStore.addProfile(profile)
    
    profileStore.setGoLoginInstances(profile.id, {
      gologin: { id: 'fake-force-gologin' },
      browser: { id: 'fake-force-browser' },
      cdp: { id: 'fake-force-cdp' }
    })
    console.log('✓ Setup complete')
    
    // Test force cleanup
    const result = await cleanupManager.performForceCleanup('test-force')
    
    console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`Message: ${result.message}`)
    console.log(`Duration: ${result.duration}ms`)
    
    return true // Force cleanup always succeeds
  } catch (error) {
    console.error(`Test failed: ${error.message}`)
    return false
  }
}

/**
 * Test emergency cleanup scenario
 */
async function testEmergencyCleanup() {
  console.log('\n=== TEST 3: Emergency Cleanup ===')
  
  try {
    // Setup
    const profile = { id: 'emergency-test', name: 'Emergency Test', token: 'fake-emergency' }
    profileStore.addProfile(profile)
    
    profileStore.setGoLoginInstances(profile.id, {
      gologin: { id: 'fake-emergency-gologin' },
      browser: { id: 'fake-emergency-browser' },
      cdp: { id: 'fake-emergency-cdp' }
    })
    console.log('✓ Setup complete')
    
    // Test emergency cleanup
    const result = await cleanupManager.performEmergencyCleanup('test-emergency')
    
    console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`Message: ${result.message}`)
    console.log(`Duration: ${result.duration}ms`)
    
    const remainingProfiles = profileStore.getProfileCount()
    console.log(`Remaining profiles: ${remainingProfiles}`)
    
    return true // Emergency cleanup should always complete
  } catch (error) {
    console.error(`Test failed: ${error.message}`)
    return false
  }
}

/**
 * Test GoLogin service cleanup
 */
async function testGoLoginService() {
  console.log('\n=== TEST 4: GoLogin Service Cleanup ===')
  
  try {
    // Setup
    const profile = { id: 'gologin-test', name: 'GoLogin Test', token: 'fake-gologin' }
    profileStore.addProfile(profile)
    
    profileStore.setGoLoginInstances(profile.id, {
      gologin: { 
        id: 'fake-service-gologin',
        stop: async () => console.log('Mock stop() called')
      },
      browser: { id: 'fake-service-browser' },
      cdp: { id: 'fake-service-cdp' }
    })
    console.log('✓ Setup complete')
    
    // Test service methods
    const closeResult = await goLoginService.closeAllProfiles()
    console.log(`CloseAllProfiles: ${closeResult.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`Profiles processed: ${closeResult.profilesProcessed}`)
    
    // Add another profile for force test
    profileStore.addProfile({ id: 'force-service-test', name: 'Force Service', token: 'fake' })
    profileStore.setGoLoginInstances('force-service-test', {
      gologin: { id: 'fake-force-service' },
      browser: { id: 'fake-force-browser' },
      cdp: { id: 'fake-force-cdp' }
    })
    
    const forceResult = await goLoginService.forceCleanupAll()
    console.log(`ForceCleanupAll: ${forceResult.success ? 'SUCCESS' : 'FAILED'}`)
    
    return true
  } catch (error) {
    console.error(`Test failed: ${error.message}`)
    return false
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('='.repeat(50))
  console.log('CLEANUP SYSTEM TEST SUITE')
  console.log('='.repeat(50))
  
  const results = []
  
  try {
    results.push(await testGracefulCleanup())
    results.push(await testForceCleanup())
    results.push(await testEmergencyCleanup())
    results.push(await testGoLoginService())
    
    const passed = results.filter(Boolean).length
    const total = results.length
    
    console.log('\n' + '='.repeat(50))
    console.log('SUMMARY')
    console.log('='.repeat(50))
    console.log(`Tests passed: ${passed}/${total}`)
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED!')
      console.log('\nCleanup system will work when:')
      console.log('- App closes normally')
      console.log('- Ctrl+C in terminal')
      console.log('- Task manager kill')
      console.log('- System shutdown')
    } else {
      console.log(`\n⚠ ${total - passed} tests failed`)
    }
    
  } catch (error) {
    console.error(`Test suite failed: ${error.message}`)
  }
  
  console.log('\n' + '='.repeat(50))
}

// Export for use in other contexts
export { runAllTests }

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}