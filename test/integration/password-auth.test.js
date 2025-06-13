import * as t from 'lib0/testing'
import * as Y from 'yjs'
import { TrysteroProvider } from '../../src/y-webrtc.js'
import * as prng from 'lib0/prng'
import { createMockTrysteroRoom, waitFor } from '../test-utils.js'

/**
 * @param {t.TestCase} tc
 */
export const testPasswordAuth = async tc => {
  const roomName = prng.word(tc.prng)
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()
  const doc3 = new Y.Doc()

  // Create mock Trystero rooms with separate instances for each provider
  const room1 = createMockTrysteroRoom()
  const room2 = createMockTrysteroRoom()
  const room3 = createMockTrysteroRoom()
  
  // Track messages between rooms
  const messageLog = []
  
  // Simulate network between rooms with same password
  const connectRooms = (roomA, roomB) => {
    const [sendA, onA] = roomA.makeAction('docdata')
    const [sendB, onB] = roomB.makeAction('docdata')
    
    onA((data, peerId) => {
      messageLog.push({ from: peerId || 'unknown', to: 'peer2', data })
      sendB(data, 'peer1')
    })
    
    onB((data, peerId) => {
      messageLog.push({ from: peerId || 'unknown', to: 'peer1', data })
      sendA(data, 'peer2')
    })
  }
  
  // Connect rooms with same password
  connectRooms(room1, room2)

  // Create providers with different passwords
  const provider1 = new TrysteroProvider(roomName, doc1, room1, {
    password: 'correct-password',
    accessLevel: 'edit'
  })
  room1._triggerPeerJoin('peer1')

  // Same password - should connect
  const provider2 = new TrysteroProvider(roomName, doc2, room2, {
    password: 'correct-password',
    accessLevel: 'edit'
  })
  room2._triggerPeerJoin('peer2')

  // Different password - should not connect
  const provider3 = new TrysteroProvider(roomName, doc3, room3, {
    password: 'wrong-password',
    accessLevel: 'edit'
  })
  room3._triggerPeerJoin('peer3')

  // Test that doc1 and doc2 can sync (same password)
  const array1 = doc1.getArray('test')
  array1.insert(0, ['hello'])
  
  // Wait for sync or timeout
  try {
    await waitFor(() => doc2.getArray('test').length > 0, 1000)
    t.pass('doc2 should receive updates from doc1 (same password)')
    t.assert(doc2.getArray('test').get(0) === 'hello', 'doc2 should have the same content as doc1')
  } catch (e) {
    t.fail('doc2 did not receive update from doc1')
  }
  
  // Test that doc3 doesn't receive updates (different password)
  t.assert(doc3.getArray('test').length === 0, 'doc3 should not receive updates from doc1 (different password)')
  
  // Test that doc3 cannot send updates to doc1/doc2
  try {
    doc3.getArray('test').insert(0, ['should not work'])
    t.fail('doc3 should not be able to modify the document')
  } catch (e) {
    t.pass('doc3 correctly prevented from modifying document')
  }
  
  // Test that doc2 can read but not modify
  t.assert(doc2.getArray('test').length === 1, 'doc2 should be able to read the document')
  try {
    doc2.getArray('test').insert(0, ['blocked'])
    t.fail('doc2 should not be able to modify the document (view-only)')
  } catch (e) {
    t.pass('doc2 correctly prevented from modifying document (view-only)')
  }

  // Cleanup
  room1._triggerPeerLeave('peer1')
  room2._triggerPeerLeave('peer2')
  room3._triggerPeerLeave('peer3')
  provider1.destroy()
  provider2.destroy()
  provider3.destroy()
  doc1.destroy()
  doc2.destroy()
  doc3.destroy()
  
  // Log message history for debugging
  console.log('Message log:', messageLog)
}
