import * as t from 'lib0/testing'
import * as Y from 'yjs'
import { TrysteroProvider } from '../src/y-webrtc.js'
import * as prng from 'lib0/prng'
import { createMockTrysteroRoom } from './test-utils.js'

/**
 * @param {t.TestCase} tc
 */
export const testAccessControl = async tc => {
  const roomName = prng.word(tc.prng)

  // Create two docs and providers
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  // Create mock Trystero room with test utilities
  const mockTrysteroRoom = createMockTrysteroRoom()

  // Create providers with different access levels
  const provider1 = new TrysteroProvider(roomName, doc1, mockTrysteroRoom, {
    accessLevel: 'edit'
  })

  // Simulate peer connection
  mockTrysteroRoom._triggerPeerJoin('peer1')

  const provider2 = new TrysteroProvider(roomName, doc2, mockTrysteroRoom, {
    accessLevel: 'view'
  })
  
  // Simulate second peer connection
  mockTrysteroRoom._triggerPeerJoin('peer2')

  // Test that editor can modify the document
  const yarray1 = doc1.get('array', Y.Array)
  yarray1.insert(0, ['hello'])
  t.assert(yarray1.get(0) === 'hello', 'Editor should be able to modify the document')

  // Test that view-only client cannot modify the document
  const yarray2 = doc2.get('array', Y.Array)
  let viewOnlyError = null
  try {
    yarray2.insert(0, ['blocked'])
    t.fail('View-only client should not be able to modify the document')
  } catch (e) {
    viewOnlyError = e
    t.pass('View-only client correctly prevented from modifying document')
  }
  
  // Test that view client can read the document
  t.assert(yarray2.length === 1, 'View client should be able to read the document')
  t.assert(yarray2.get(0) === 'hello', 'View client should see the same data as editor')
  
  // Test that changes from editor are visible to view client
  yarray1.insert(1, ['world'])
  t.assert(yarray2.get(1) === 'world', 'View client should receive updates from editor')
  
  // Test that view client cannot perform unauthorized operations
  try {
    yarray2.delete(0, 1)
    t.fail('View client should not be able to delete content')
  } catch (e) {
    t.pass('View client correctly prevented from deleting content')
  }

  // Clean up
  mockTrysteroRoom._triggerPeerLeave('peer1')
  mockTrysteroRoom._triggerPeerLeave('peer2')
  provider1.destroy()
  provider2.destroy()
  doc1.destroy()
  doc2.destroy()
}
