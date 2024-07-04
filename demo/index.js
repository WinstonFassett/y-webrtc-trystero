/* eslint-env browser */

import { doc, trysteroProvider as provider } from './sharedTypes.js'
import * as drawing from './drawing.js'
import { drawingDemo } from './elements.js'

const yarray = doc.getArray()

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
window.example = { provider, doc, yarray, drawing, drawingDemo }
