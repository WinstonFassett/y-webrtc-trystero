/* eslint-env browser */

import {
  doc,
  trysteroProvider as provider,
  drawingContent,
  prosemirrorEditorContent,
  permanentUserData
} from './sharedTypes.js'
import * as drawing from './drawing.js'
import { drawingDemo } from './elements.js'

// Initialize the drawing array
const yarray = doc.getArray('demo-array')

// Log connection events
provider.on('synced', synced => {
  console.log('Synced with remote peers:', synced)
  console.log('Room ID:', provider.roomName)
  console.log('Client ID:', doc.clientID)
})

// Log when peers connect/disconnect
provider.on('peers', ({ added, removed }) => {
  if (added.length) console.log('Peers connected:', added)
  if (removed.length) console.log('Peers disconnected:', removed)
})

// Log array changes
yarray.observeDeep(() => {
  console.log('Array updated:', yarray.toJSON())
})

// Add some initial data if array is empty
if (yarray.length === 0) {
  yarray.insert(0, ['Welcome to y-webrtc-trystero demo!'])
}

// Make objects available in console for debugging
Object.assign(window, {
  ytrystero: {
    provider,
    doc,
    yarray,
    drawing,
    drawingDemo,
    drawingContent,
    prosemirrorEditorContent,
    permanentUserData
  },
  // Keep backward compatibility
  example: {
    provider,
    doc,
    yarray,
    drawing,
    drawingDemo
  }
})

console.log('y-webrtc-trystero demo initialized. Access objects via `ytrystero` in the console.')
