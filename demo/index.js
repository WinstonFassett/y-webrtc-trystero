/* eslint-env browser */

import * as Y from 'yjs'
import { TrysteroProvider } from '../src/y-trystero.js'
import { joinRoom } from 'trystero'

const ydoc = new Y.Doc()
const appId = 'y-trystero-demo'
const roomId = 'y-trystero-demo-room'
const provider = new TrysteroProvider(roomId, ydoc, joinRoom({ appId }, roomId))
const yarray = ydoc.getArray()

provider.on('synced', synced => {
  // NOTE: This is only called when a different browser connects to this client
  // Windows of the same browser communicate directly with each other
  // Although this behavior might be subject to change.
  // It is better not to expect a synced event when using y-trystero
  console.log('synced!', synced)
})

yarray.observeDeep(() => {
  console.log('yarray updated: ', yarray.toJSON())
})

// @ts-ignore
window.example = { provider, ydoc, yarray }
