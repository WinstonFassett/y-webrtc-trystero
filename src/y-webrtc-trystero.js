import * as bc from 'lib0/broadcastchannel'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as error from 'lib0/error'
import * as logging from 'lib0/logging'
import * as map from 'lib0/map'
import * as math from 'lib0/math'
import { createMutex } from 'lib0/mutex'
import { ObservableV2 as ObservableV2Base } from 'lib0/observable'
import * as random from 'lib0/random'

import { selfId, joinRoom as defaultJoinRoom } from 'trystero'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'

// Type definitions
/** @typedef {import('yjs').Doc} YDoc */
/** @typedef {import('y-protocols/awareness').Awareness} Awareness */
/** @typedef {import('trystero').Room} TrysteroRoom */

// Message types - these match y-protocols/constants
const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3
const messageBcPeerId = 4

const log = logging.createModuleLogger('y-webrtc-trystero')

// Re-export for convenience
export { selfId }

/**
 * @type {Map<string,TrysteroDocRoom>}
 */
export const rooms = new Map()

/**
 * @param {string} roomId - The ID of the room to get
 * @return {TrysteroDocRoom | undefined} The room if it exists
 */
export const getRoom = (roomId) => rooms.get(roomId)

/**
 * @param {TrysteroDocRoom} room
 */
const checkIsSynced = (room) => {
  let synced = true
  room.trysteroConns.forEach((peer) => {
    if (!peer.synced) {
      synced = false
    }
  })
  if ((!synced && room.synced) || (synced && !room.synced)) {
    room.synced = synced
    room.provider.emit('synced', [{ synced }])
    log('synced ', logging.BOLD, room.name, logging.UNBOLD, ' with all peers')
  }
}

/**
 * @param {decoding.Decoder} decoder
 * @param {encoding.Encoder} encoder
 * @param {YDoc} doc
 * @param {any} transactionOrigin
 * @param {'view' | 'edit'} accessLevel
 * @return {number}
 */
const readSyncMessage = (decoder, encoder, doc, transactionOrigin, accessLevel) => {
  const messageType = decoding.readVarUint(decoder)
  switch (messageType) {
    case syncProtocol.messageYjsSyncStep1:
      syncProtocol.readSyncStep1(decoder, encoder, doc)
      break
    case syncProtocol.messageYjsSyncStep2:
      if (accessLevel !== 'edit') {
        console.warn('edit disabled', doc.guid)
        return messageType
      }
      syncProtocol.readSyncStep2(decoder, doc, transactionOrigin)
      break
    case syncProtocol.messageYjsUpdate:
      if (accessLevel !== 'edit') {
        console.warn('edit disabled', doc.guid, accessLevel)
        return messageType
      }
      syncProtocol.readUpdate(decoder, doc, transactionOrigin)
      break
    default:
      throw new Error('Unknown message type')
  }
  return messageType
}

/**
 * @param {TrysteroDocRoom} room
 * @param {Uint8Array} buf
 * @param {function} syncedCallback
 * @return {encoding.Encoder?}
 */
const readMessage = (room, buf, syncedCallback) => {
  const decoder = decoding.createDecoder(buf)
  const encoder = encoding.createEncoder()
  const messageType = decoding.readVarUint(decoder)
  if (room === undefined) {
    return null
  }
  const awareness = room.awareness
  const doc = room.doc
  let sendReply = false
  switch (messageType) {
    case messageSync: {
      encoding.writeVarUint(encoder, messageSync)
      const syncMessageType = readSyncMessage(
        decoder,
        encoder,
        doc,
        room,
        room.provider.accessLevel || 'edit' // Default to 'edit' for backward compatibility
      )
      if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !room.synced) {
        syncedCallback()
      }
      if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
        sendReply = true
      }
      break
    }
    case messageQueryAwareness:
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())))
      sendReply = true
      break
    case messageAwareness:
      awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), room)
      break
    case messageBcPeerId: {
      const add = decoding.readUint8(decoder) === 1
      const peerName = decoding.readVarString(decoder)
      if (peerName !== room.peerId && ((room.bcConns.has(peerName) && !add) || (!room.bcConns.has(peerName) && add))) {
        const removed = []
        const added = []
        if (add) {
          room.bcConns.add(peerName)
          added.push(peerName)
        } else {
          room.bcConns.delete(peerName)
          removed.push(peerName)
        }
        room.provider.emit('peers', [{
          added,
          removed,
          trysteroPeers: Array.from(room.trysteroConns.keys()),
          bcPeers: Array.from(room.bcConns)
        }])
        broadcastBcPeerId(room)
      }
      break
    }
    default:
      console.error('Unable to compute message')
      return encoder
  }
  if (!sendReply) {
    // nothing has been written, no answer created
    return null
  }
  return encoder
}

/**
 * @param {TrysteroConn} peerConn
 * @param {Uint8Array} buf
 * @return {encoding.Encoder?}
 */
const readPeerMessage = (peerConn, buf) => {
  const room = peerConn.room
  log('received message from ', logging.BOLD, peerConn.remotePeerId, logging.GREY, ' (', room.name, ')', logging.UNBOLD, logging.UNCOLOR)
  return readMessage(room, buf, () => {
    peerConn.synced = true
    log('synced ', logging.BOLD, room.name, logging.UNBOLD, ' with ', logging.BOLD, peerConn.remotePeerId)
    checkIsSynced(room)
  })
}

/**
 * @param {TrysteroConn} trysteroConn
 * @param {encoding.Encoder} encoder
 */
const sendTrysteroConn = (trysteroConn, encoder) => {
  log('send message to ', logging.BOLD, trysteroConn.remotePeerId, logging.UNBOLD, logging.GREY, ' (', trysteroConn.room.name, ')', logging.UNCOLOR)
  try {
    trysteroConn.room.provider.sendDocData(encoding.toUint8Array(encoder), trysteroConn.remotePeerId)
  } catch (e) {
    console.log('error sending', e)
  }
}

/**
 * @param {TrysteroDocRoom} room
 * @param {Uint8Array} m
 */
const broadcastTrysteroConn = (room, m) => {
  log('broadcast message in ', logging.BOLD, room.name, logging.UNBOLD)
  room.trysteroConns.forEach((conn) => {
    try {
      conn.room.provider.sendDocData(m)
    } catch (e) {
      console.log('error broadcasting', e)
    }
  })
}

export class TrysteroConn {
  /**
   * @param {string} remotePeerId
   * @param {TrysteroDocRoom} room
   */
  constructor (remotePeerId, room) {
    log('connected to ', logging.BOLD, remotePeerId)
    this.room = room
    this.remotePeerId = remotePeerId
    this.closed = false
    this.connected = false
    this.synced = false

    // already connected
    this.connected = true
    // send sync step 1
    const provider = room.provider
    const doc = provider.doc
    const awareness = room.awareness
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, doc)
    sendTrysteroConn(this, encoder)
    const awarenessStates = awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())))
      sendTrysteroConn(this, encoder)
    }
    provider.listenDocData((data, peerId) => {
      const arr = /** @type {Uint8Array} */ (data)
      try {
        const answer = readPeerMessage(this, arr)
        if (answer !== null) {
          sendTrysteroConn(this, answer)
        }
      } catch (err) {
        console.log(err)
      }
    })
  }

  onClose () {
    this.connected = false
    this.closed = true
    const { room, remotePeerId } = this
    if (room.trysteroConns.has(remotePeerId)) {
      room.trysteroConns.delete(remotePeerId)
      room.provider.emit('peers', [
        {
          removed: [remotePeerId],
          added: [],
          trysteroPeers: Array.from(room.trysteroConns.keys()),
          bcPeers: Array.from(room.bcConns)
        }
      ])
    }
    checkIsSynced(room)
    log('closed connection to ', logging.BOLD, remotePeerId)
  }

  destroy () {
    // console.log("todo: destroy conn(?)");
  }
}

/**
 * @param {TrysteroDocRoom} room
 * @param {Uint8Array} m
 */
const broadcastBcMessage = (room, m) => {
  room.mux(() => {
    bc.publish(room.name, m)
  })
}

/**
 * @param {TrysteroDocRoom} room
 * @param {Uint8Array} m
 */
const broadcastRoomMessage = (room, m) => {
  if (room.bcconnected) {
    broadcastBcMessage(room, m)
  }
  broadcastTrysteroConn(room, m)
}

/**
 * @param {TrysteroDocRoom} room
 */
const broadcastBcPeerId = (room) => {
  if (room.provider.filterBcConns) {
    // broadcast peerId via broadcastchannel
    const encoderPeerIdBc = encoding.createEncoder()
    encoding.writeVarUint(encoderPeerIdBc, messageBcPeerId)
    encoding.writeUint8(encoderPeerIdBc, 1)
    encoding.writeVarString(encoderPeerIdBc, room.peerId)
    broadcastBcMessage(room, encoding.toUint8Array(encoderPeerIdBc))
  }
}

export class TrysteroDocRoom {
  /**
   * @param {YDoc} doc
   * @param {TrysteroProvider} provider
   * @param {string} name
   * @param {string|undefined} password
   */
  constructor (doc, provider, name, password) {
    this.peerId = selfId
    this.doc = doc
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = provider.awareness
    this.provider = provider
    this.synced = false
    this.name = name
    this.password = password
    /**
     * @type {Map<string, TrysteroConn>}
     */
    this.trysteroConns = new Map()
    /**
     * @type {Set<string>}
     */
    this.bcConns = new Set()
    this.mux = createMutex()
    this.bcconnected = false
    /**
     * @param {ArrayBuffer} data
     */
    this._bcSubscriber = data => {
      this.mux(() => {
        const reply = readMessage(this, new Uint8Array(data), () => {})
        if (reply) {
          broadcastBcMessage(this, encoding.toUint8Array(reply))
        }
      })
    }
    /**
     * Listens to Yjs updates and sends them to remote peers
     *
     * @param {Uint8Array} update
     * @param {any} _origin
     */
    this._docUpdateHandler = (update, _origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      broadcastRoomMessage(this, encoding.toUint8Array(encoder))
    }
    /**
     * Listens to Awareness updates and sends them to remote peers
     *
     * @param {any} changed
     * @param {any} _origin
     */
    this._awarenessUpdateHandler = ({ added, updated, removed }, _origin) => {
      const changedClients = added.concat(updated).concat(removed)
      const encoderAwareness = encoding.createEncoder()
      encoding.writeVarUint(encoderAwareness, messageAwareness)
      encoding.writeVarUint8Array(encoderAwareness, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
      broadcastRoomMessage(this, encoding.toUint8Array(encoderAwareness))
    }

    this._beforeUnloadHandler = () => {
      awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], 'window unload')
      rooms.forEach(room => {
        room.disconnect()
      })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._beforeUnloadHandler)
    } else if (typeof process !== 'undefined') {
      process.on('exit', this._beforeUnloadHandler)
    }

    provider.trystero.onPeerJoin((peerId) => {
      log(`${peerId} joined`)
      if (this.trysteroConns.size < provider.maxConns) {
        map.setIfUndefined(this.trysteroConns, peerId, () => {
          if (!provider.room) throw new Error('Room not initialized')
          return new TrysteroConn(peerId, provider.room)
        })
      }
    })
    provider.trystero.onPeerLeave((peerId) => {
      const conn = this.trysteroConns.get(peerId)
      if (conn) conn.onClose()
      if (this.trysteroConns.has(peerId)) {
        this.trysteroConns.delete(peerId)
        this.provider.emit('peers', [
          {
            removed: [peerId],
            added: [],
            trysteroPeers: provider.room ? Array.from(provider.room.trysteroConns.keys()) : [],
            bcPeers: Array.from(this.bcConns)
          }
        ])
      }
      checkIsSynced(this)
      log('closed connection to ', logging.BOLD, peerId)
    })
  }

  connectToDoc () {
    this.doc.on('update', this._docUpdateHandler)
    this.awareness.on('update', this._awarenessUpdateHandler)
    const roomName = this.name
    bc.subscribe(roomName, this._bcSubscriber)
    this.bcconnected = true
    // broadcast peerId via broadcastchannel
    broadcastBcPeerId(this)
    // write sync step 1
    const encoderSync = encoding.createEncoder()
    encoding.writeVarUint(encoderSync, messageSync)
    syncProtocol.writeSyncStep1(encoderSync, this.doc)
    broadcastBcMessage(this, encoding.toUint8Array(encoderSync))
    // broadcast local state
    const encoderState = encoding.createEncoder()
    encoding.writeVarUint(encoderState, messageSync)
    syncProtocol.writeSyncStep2(encoderState, this.doc)
    broadcastBcMessage(this, encoding.toUint8Array(encoderState))
    // write queryAwareness
    const encoderAwarenessQuery = encoding.createEncoder()
    encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
    broadcastBcMessage(this, encoding.toUint8Array(encoderAwarenessQuery))
    // broadcast local awareness state
    const encoderAwarenessState = encoding.createEncoder()
    encoding.writeVarUint(encoderAwarenessState, messageAwareness)
    encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
    broadcastBcMessage(this, encoding.toUint8Array(encoderAwarenessState))
  }

  disconnect () {
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'disconnect')
    // broadcast peerId removal via broadcastchannel
    const encoderPeerIdBc = encoding.createEncoder()
    encoding.writeVarUint(encoderPeerIdBc, messageBcPeerId)
    encoding.writeUint8(encoderPeerIdBc, 0) // remove peerId from other bc peers
    encoding.writeVarString(encoderPeerIdBc, this.peerId)
    broadcastBcMessage(this, encoding.toUint8Array(encoderPeerIdBc))

    bc.unsubscribe(this.name, this._bcSubscriber)
    this.bcconnected = false
    this.doc.off('update', this._docUpdateHandler)
    this.awareness.off('update', this._awarenessUpdateHandler)
    this.trysteroConns.forEach(conn => conn.destroy())
  }

  destroy () {
    this.disconnect()
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
    } else if (typeof process !== 'undefined') {
      process.off('exit', this._beforeUnloadHandler)
    }
  }
}

/**
 * @param {YDoc} doc
 * @param {TrysteroProvider} provider
 * @param {string} name
 * @param {string|undefined} password
 * @return {TrysteroDocRoom}
 */
const openRoom = (doc, provider, name, password) => {
  // there must only be one room
  if (rooms.has(name)) {
    throw error.create(`A Yjs Doc connected to room "${name}" already exists!`)
  }
  const room = new TrysteroDocRoom(doc, provider, name, password)
  room.connectToDoc()
  rooms.set(name, /** @type {TrysteroDocRoom} */ (room))
  return room
}

/**
 * @typedef {Object} ProviderOptions
 * @property {string} [appId] - The Trystero app ID. Defaults to 'y-webrtc-trystero-app'.
 * @property {TrysteroRoom} [trysteroRoom] - The TrysteroRoom instance. If not provided, one will be created.
 * @property {(opts: any, roomId: string) => TrysteroRoom} [joinRoom] - Function to join a Trystero room.
 * @property {string} [password] - Optional password for encryption.
 * @property {Awareness} [awareness] - Awareness instance. If not provided, a new one will be created.
 * @property {number} [maxConns] - Maximum number of connections. Defaults to a random number between 20-34.
 * @property {boolean} [filterBcConns=true] - Whether to filter broadcast connections.
 * @property {'view' | 'edit'} [accessLevel='edit'] - Access level for the document ('view' or 'edit').
 * @property {any} [peerOpts] - Additional peer options.
 */

// Export types for TypeScript consumers
export {}

/**
 * @typedef {Object} TrysteroProviderEvents
 * @property {(event: { connected: boolean }) => void} status - Emitted when connection status changes.
 * @property {(event: { synced: boolean }) => void} synced - Emitted when sync status changes.
 * @property {() => void} destroy - Emitted when the provider is destroyed.
 * @property {(event: {
 *   added: string[],
 *   removed: string[],
 *   trysteroPeers: string[],
 *   bcPeers: string[]
 * }) => void} peers - Emitted when peer list changes.
 */

/** @typedef {import('lib0/observable').ObservableV2<TrysteroProviderEvents>} ObservableV2 */

/** @extends {ObservableV2Base<TrysteroProviderEvents>} */
export class TrysteroProvider extends ObservableV2Base {
  /**
   * @class
   * @classdesc Represents a Y.Trystero instance.
   * @param {string} roomName - The name of the room.
   * @param {YDoc} doc - The Y.Doc instance.
   * @param {ProviderOptions} opts
   */
  constructor (
    roomName,
    doc,
    {
      appId,
      password,
      joinRoom,
      trysteroRoom = (joinRoom || defaultJoinRoom)({ appId: appId || 'y-webrtc-trystero-app', password }, roomName),
      awareness = new awarenessProtocol.Awareness(doc),
      maxConns = 20 + math.floor(random.rand() * 15), // the random factor reduces the chance that n clients form a cluster
      filterBcConns = true,
      accessLevel = 'edit' // Default to 'edit' for backward compatibility
    } = {
      appId: 'y-webrtc-trystero-app',
      password: undefined,
      joinRoom: defaultJoinRoom,
      trysteroRoom: undefined,
      awareness: new awarenessProtocol.Awareness(doc),
      maxConns: 20 + math.floor(random.rand() * 15),
      filterBcConns: true,
      accessLevel: 'edit'
    }
  ) {
    super()
    this.doc = doc
    this.maxConns = maxConns
    this.filterBcConns = filterBcConns
    this.accessLevel = accessLevel
    this.password = password
    this.trystero = trysteroRoom
    /**
     * @type {TrysteroDocRoom|null}
     */
    this.room = null
    this.roomName = roomName
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = awareness

    // Create the room with the password
    this.room = openRoom(doc, this, roomName, password)
    doc.on('destroy', () => this.destroy())

    // Set up Trystero actions
    const [sendDocData, listenDocData] = trysteroRoom.makeAction('docdata')
    this.sendDocData = sendDocData
    this.listenDocData = listenDocData
  }

  destroy () {
    this.doc.off('destroy', this.destroy)
    // Clean up the room immediately
    if (this.room) {
      this.room.destroy()
      rooms.delete(this.roomName)
    }
    this.emit('destroy', [])
    super.destroy()
  }
}
