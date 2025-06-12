import * as t from 'lib0/testing'
import * as Y from 'yjs'
import { TrysteroProvider } from '../src/y-webrtc.js'
import * as prng from 'lib0/prng'

/**
 * @param {t.TestCase} tc
 */
export const testAccessControl = async tc => {
  const roomName = prng.word(tc.prng)
  
  // Create two docs and providers
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()
  
  // Mock Trystero room
  const mockTrysteroRoom = {
    makeAction: () => [
      (data, peerId) => { /* noop */ },
      (callback) => { /* noop */ }
    ],
    onPeerJoin: () => { /* noop */ },
    onPeerLeave: () => { /* noop */ }
  }
  
  // Create providers with different access levels
  const provider1 = new TrysteroProvider(roomName, doc1, mockTrysteroRoom, {
    accessLevel: 'edit'
  })
  
  const provider2 = new TrysteroProvider(roomName, doc2, mockTrysteroRoom, {
    accessLevel: 'view'
  })
  
  // Test that provider1 can modify the document
  const yarray1 = doc1.get('array', Y.Array)
  yarray1.insert(0, ['hello'])
  t.assert(yarray1.get(0) === 'hello', 'Editor should be able to modify the document')
  
  // Test that provider2 cannot modify the document
  const yarray2 = doc2.get('array', Y.Array)
  let viewOnlyError = null
  try {
    yarray2.insert(0, ['blocked'])
  } catch (e) {
    viewOnlyError = e
  }
  t.assert(viewOnlyError !== null, 'View-only client should not be able to modify the document')
  
  // Clean up
  doc1.destroy()
  doc2.destroy()
  provider1.destroy()
  provider2.destroy()
}
