import { runTests } from 'lib0/testing'
import { isBrowser, isNode } from 'lib0/environment'
import * as log from 'lib0/logging'

// Import test suites
import { testAccessControl } from '../test/access-control.test.js'
import { testPasswordAuth } from '../test/integration/password-auth.test.js'
import { testBasicSync } from '../test/integration/sync.test.js'

if (isBrowser) {
  log.createVConsole(document.body)
}

async function run () {
  const success = await runTests({
    'access-control': testAccessControl,
    'password-auth': testPasswordAuth,
    'basic-sync': testBasicSync
  })

  if (isNode) {
    process.exit(success ? 0 : 1)
  }
}

// Run the async function and handle any uncaught errors
run().catch(err => {
  console.error('Uncaught error in test runner:', err)
  process.exit(1)
})
