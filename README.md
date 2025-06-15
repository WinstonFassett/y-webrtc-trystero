# y-webrtc-trystero

> [Trystero](https://github.com/dmotz/trystero) provider for [Yjs](https://github.com/yjs/yjs)

This is fork of [y-webrtc](https://github.com/yjs/y-webrtc) that uses [Trystero](https://github.com/dmotz/trystero) for WebRTC connections and end-to-end encryption.

### Key Differences from y-webrtc
- Uses Trystero for signaling instead of the default signaling servers
- Uses Trystero's end-to-end encryption instead of y-webrtc's crypto.js encryption
- Supports all Trystero backends (Firebase, IPFS, etc.)
- Maintains the same Yjs provider interface for easy migration

## Installation

```bash
npm install y-webrtc-trystero
```

## Installation

```bash
npm install y-webrtc-trystero
```

## Basic Usage

```javascript
import * as Y from 'yjs'
import { TrysteroProvider } from 'y-webrtc-trystero'
import { joinRoom } from 'trystero'

// Configuration
const APP_ID = 'your-app-id' // Unique identifier for your app
const ROOM_ID = 'your-room-name' // Shared room identifier for all clients
const ROOM_PASSWORD = 'optional-room-password' // Optional password for encryption

// Create a Y.Doc
const doc = new Y.Doc()

// Initialize Trystero room with optional password
// Note: Trystero always uses encryption, but you can add an additional password for room access
const trysteroRoom = joinRoom({
  appId: APP_ID,
  password: ROOM_PASSWORD // Optional: Add a password for room access
}, ROOM_ID)

// Method 1: Simple connection with just appId and room name
const provider1 = new TrysteroProvider(
  ROOM_ID,      // Room identifier
  doc,           // Y.Doc instance
  {
    appId: APP_ID,        // Required: Your Trystero app ID
    password: ROOM_PASSWORD, // Optional: password for room access
    maxConns: 30,           // Optional: maximum peer connections
    awareness: new awarenessProtocol.Awareness(doc) // Optional: awareness protocol
  }
)

// Method 2: Custom joinRoom function for advanced configuration
const provider2 = new TrysteroProvider(
  ROOM_ID,
  doc,
  {
    appId: APP_ID,
    // Custom function to create the Trystero room
    joinRoom: (config, roomId) => {
      return joinRoom({
        ...config,
        // Add custom Trystero configuration
        appId: config.appId,
        password: ROOM_PASSWORD,
        // Add any other Trystero options here
      }, roomId)
    },
    maxConns: 30
  }
)

// Method 3: Use an existing TrysteroRoom instance
const trysteroRoom = joinRoom({ 
  appId: APP_ID,
  password: ROOM_PASSWORD 
}, ROOM_ID)

const provider3 = new TrysteroProvider(
  ROOM_ID,
  doc,
  {
    trysteroRoom,  // Use pre-configured room
    maxConns: 30
  }
)

// Access shared data
const yarray = doc.getArray('shared-array')
const ymap = doc.getMap('shared-map')

// Listen for sync status
doc.on('sync', isSynced => {
  console.log(`Document ${isSynced ? 'synced' : 'syncing...'}`)
})
```

### Key Features

* No server required!
* Built-in end-to-end encryption (always enabled)
* Fast message propagation using WebRTC
* Low server load with peer-to-peer connections
* Automatic reconnection and sync status tracking
* Works with any Trystero backend (Firebase, IPFS, etc.)

## Setup

### Install

```bash
npm install y-webrtc-trystero trystero yjs
```
### Communication Restrictions

y-webrtc-trystero is restricted by the number of peers that the web browser can create. By default, every client is connected to every other client up until the maximum number of conns is reached. The clients will still sync if every client is connected at least indirectly to every other client. Theoretically, y-webrtc-trystero allows an unlimited number of users, but at some point it can't be guaranteed anymore that the clients sync any longer. The default maximum connections is set to `20 + math.floor(random.rand() * 15)` peers. The random factor helps prevent clients from forming isolated clusters. You can adjust this using the `maxConns` option. For example:

```js
const provider = new TrysteroProvider('your-room-name', ydoc, { 
  appId: 'your-app-id',
  maxConns: 70 + math.floor(random.rand() * 70) 
})
```

** A gifted mind could use this as an exercise and calculate the probability of clusters forming depending on the number of peers in the network. The default value was used to connect at least 100 clients at a conference meeting on a bad network connection.

### Use y-webrtc-trystero for conferencing solutions

Just listen to the "peers" event from the provider to listen for more incoming WebRTC connections and use the [Trystero library](https://github.com/dmotz/y-webrtc-trystero) to share streams. More help on this would be welcome. By default, browser windows share data using BroadcastChannel without WebRTC. In order to connect all peers and browser windows with each other, set `maxConns = Number.POSITIVE_INFINITY` and `filterBcConns = false`.

## API

```js
new TrysteroProvider(roomName, ydoc, [, opts])
```

The following default values of `opts` can be overwritten:

```js
{
  // Connection Options (choose one of the following):
  
  // Option 1: Simple connection with appId (recommended for most cases)
  appId: 'y-webrtc-trystero-app',  // Required: Your Trystero app ID
  
  // Option 2: Custom joinRoom function (for advanced configuration)
  // joinRoom: (config, roomId) => {
  //   return joinRoom({
  //     ...config,
  //     // Add custom Trystero configuration here
  //   }, roomId)
  // },
  
  // Option 3: Use an existing TrysteroRoom instance
  // trysteroRoom: yourTrysteroRoomInstance,
  
  // Optional: Password for room access and encryption
  // If provided, it will be used to encrypt all communication over the signaling servers.
  // No sensitive information (WebRTC connection info, shared data) will be shared over the signaling servers.
  // The main objective is to prevent man-in-the-middle attacks and to allow you to securely use public / untrusted signaling instances.
  password: null,
  // Specify an existing Awareness instance - see https://github.com/yjs/y-protocols
  awareness: new awarenessProtocol.Awareness(doc),
  // Maximal number of WebRTC connections.
  // A random factor is recommended, because it reduces the chance that n clients form a cluster.
  maxConns: 20 + math.floor(random.rand() * 15),
  // Whether to disable WebRTC connections to other tabs in the same browser.
  // Tabs within the same browser share document updates using BroadcastChannels.
  // WebRTC connections within the same browser are therefore only necessary if you want to share video information too.
  filterBcConns: true,
  // Access level for the document. Can be 'view' or 'edit'.
  // When set to 'view', the client will not be able to modify the document.
  accessLevel: 'edit'
}
```

## Logging

`y-webrtc-trystero` uses the `lib0/logging.js` logging library. By default this library disables logging. You can enable it by specifying the `log` environment / localStorage variable:

```js
// enable logging for all modules
localStorage.log = 'true'
// enable logging only for y-webrtc-trystero
localStorage.log = 'y-webrtc-trystero'
// by specifying a regex variables
localStorage.log = '^y.*'
```

```sh
# enable y-webrtc-trystero logging in nodejs
LOG='y-webrtc-trystero' node index.js
```

## License
This project is licensed under the [MIT License](./LICENSE).

## Acknowledgments
- Based on the original work by Kevin Jahns and contributors
- Uses [Trystero](https://github.com/dmotz/trystero) for WebRTC connections
- Built on top of [Yjs](https://github.com/yjs/yjs)
