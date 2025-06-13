import * as Y from 'yjs'
import { TrysteroProvider } from 'y-trystero'
import { joinRoom } from 'trystero'

// Configuration
const SUFFIX = '-v3'
const APP_ID = 'y-trystero-demo' + SUFFIX
const ROOM_ID = 'y-trystero-demo-room' + SUFFIX
// Set a password for the room (in a real app, this would be configurable)
const ROOM_PASSWORD = 'demo-password-123'

// Create Y.Doc with garbage collection filter
const gcFilter = item => !Y.isParentOf(prosemirrorEditorContent, item)

// Initialize documents
export const doc = new Y.Doc({ gcFilter })

// Initialize Trystero room with password
export const trysteroRoom = joinRoom({ 
  appId: APP_ID,
  password: ROOM_PASSWORD // Add password for encryption
}, ROOM_ID)

// Create provider with password
export const trysteroProvider = new TrysteroProvider(
  ROOM_ID,
  doc,
  trysteroRoom,
  {
    password: ROOM_PASSWORD,
    accessLevel: 'edit' // Allow editing by default
  }
)

export const awareness = trysteroProvider.awareness

// Initialize document structures
export const prosemirrorEditorContent = doc.getXmlFragment('prosemirror')

// Simple user data management
class LocalRemoteUserData extends Y.PermanentUserData {
  /**
   * @param {Y.Doc} doc
   * @param {Y.Map<any>} userType
   */
  constructor (doc, userType) {
    super(doc, userType, 'local')
    this.userType = userType
  }

  /**
   * @param {Y.Doc} doc
   * @param {number} clientid
   * @param {string} username
   * @param {Object} userinfo
   */
  setUserMapping (doc, clientid, username, userinfo) {
    super.setUserMapping(doc, clientid, username, userinfo)
  }
}

// Initialize user data
export const versionDoc = new Y.Doc()
const userType = versionDoc.getMap('users')
export const permanentUserData = new LocalRemoteUserData(doc, userType)

// Set initial user mapping
permanentUserData.setUserMapping(doc, doc.clientID, 'local', {
  name: 'User-' + Math.random().toString(36).substr(2, 5),
  color: getRandomColor()
})

/**
 * Generate a random color for the user
 * @returns {{color: string, light: string}}
 */
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360)
  return {
    color: `hsl(${hue}, 70%, 50%)`,
    light: `hsla(${hue}, 70%, 50%, 0.2)`
  }
}

// Initialize drawing content
export const drawingContent = doc.getArray('drawing')

let undoManager = null

export const setUndoManager = nextUndoManager => {
  if (undoManager) {
    undoManager.clear()
  }
  undoManager = nextUndoManager
}

// @ts-ignore
window.ydoc = doc
// @ts-ignore
window.versionDoc = versionDoc
// @ts-ignore
window.awareness = awareness
// @ts-ignore
window.trysteroProvider = trysteroProvider
// @ts-ignore
window.prosemirrorEditorContent = prosemirrorEditorContent
