
import { runTests } from 'lib0/testing'
import { isBrowser, isNode } from 'lib0/environment'
import * as log from 'lib0/logging'

// Import test suites
import { testAccessControl } from './integration/access-control.test.js'
import { testPasswordAuth } from './integration/password-auth.test.js'
import { testBasicSync } from './integration/sync.test.js'

if (isBrowser) {
  log.createVConsole(document.body)
}

runTests({
  'access-control': testAccessControl,
  'password-auth': testPasswordAuth,
  'basic-sync': testBasicSync
}).then(success => {
  /* istanbul ignore next */
  if (isNode) {
    process.exit(success ? 0 : 1)
  }
})
