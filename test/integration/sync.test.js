import * as t from 'lib0/testing'
import * as Y from 'yjs'
import { TrysteroProvider } from '../../src/y-webrtc-trystero.js'
import * as prng from 'lib0/prng'
import { createMockTrysteroRoom, waitFor } from '../test-utils.js'

/**
 * @param {t.TestCase} tc
 */
export const testBasicSync = async tc => {
  const roomName = prng.word(tc.prng)
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  // Create mock Trystero rooms with test utilities
  const room1 = createMockTrysteroRoom()
  const room2 = createMockTrysteroRoom()

  // Simulate network between rooms
  const [send1, on1] = room1.makeAction('docdata')
  const [send2, on2] = room2.makeAction('docdata')

  on1((data, peerId) => {
    // Simulate network delay
    setTimeout(() => send2(data, 'peer1'), 10)
  })

  on2((data, peerId) => {
    // Simulate network delay
    setTimeout(() => send1(data, 'peer2'), 10)
  })

  // Create two providers that should sync
  const provider1 = new TrysteroProvider(roomName, doc1, {
    appId: 'test-app',
    trysteroRoom: room1,
    accessLevel: 'edit'
  })
  room1._triggerPeerJoin('peer1')

  const provider2 = new TrysteroProvider(roomName, doc2, {
    appId: 'test-app',
    trysteroRoom: room2,
    accessLevel: 'edit'
  })
  room2._triggerPeerJoin('peer2')

  // Test basic sync from doc1 to doc2
  const array1 = doc1.getArray('test')
  array1.insert(0, ['hello'])

  // Wait for sync with timeout
  try {
    await waitFor(() => doc2.getArray('test').length > 0, 1000)
    t.pass('doc2 received update from doc1')
    t.assert(doc2.getArray('test').get(0) === 'hello', 'doc2 should have the same content as doc1')
  } catch (e) {
    t.fail('doc2 did not receive update from doc1')
  }

  // Test sync in the opposite direction (doc2 to doc1)
  const array2 = doc2.getArray('test')
  array2.insert(1, ['world'])

  try {
    await waitFor(() => array1.length > 1, 1000)
    t.pass('doc1 received update from doc2')
    t.assert(array1.get(1) === 'world', 'doc1 should have received the update from doc2')
  } catch (e) {
    t.fail('doc1 did not receive update from doc2')
  }

  // Test concurrent modifications
  array1.insert(2, ['from1'])
  array2.insert(3, ['from2'])

  try {
    await waitFor(() => array1.length === 4 && array2.length === 4, 1000)
    t.pass('Both docs should have all updates')
    t.assert(array1.get(2) === 'from1' && array2.get(2) === 'from1', 'Concurrent update 1 should be synced')
    t.assert(array1.get(3) === 'from2' && array2.get(3) === 'from2', 'Concurrent update 2 should be synced')
  } catch (e) {
    t.fail('Docs did not sync concurrent updates')
  }

  // Cleanup
  room1._triggerPeerLeave('peer1')
  room2._triggerPeerLeave('peer2')
  provider1.destroy()
  provider2.destroy()
  doc1.destroy()
  doc2.destroy()
}
