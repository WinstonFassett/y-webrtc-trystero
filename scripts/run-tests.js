import * as testing from 'lib0/testing'
import * as tests from '../test/crypto.test.js'
import * as accessControlTests from '../test/access-control.test.js'

const testModules = [
  tests,
  accessControlTests
]

const testResults = await testing.runAllTests({
  // Run in verbose mode
  verbose: true,
  // Exit process with code 1 if tests fail
  exitOnError: true,
  // Run all test modules
  testModules
})

// Print summary
console.log('\nTest Summary:')
console.log(`✅ ${testResults.passed} tests passed`)
if (testResults.failed > 0) {
  console.error(`❌ ${testResults.failed} tests failed`)
  process.exit(1)
}
