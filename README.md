# Trystero WebRTC connector for [Yjs](https://github.com/yjs/yjs)

Propagates document updates peer-to-peer to all users using WebRTC connected using [trystero](https://github.com/dmotz/trystero).

* Fast message propagation
* Encryption and authorization over untrusted signaling servers
* No setup required, public signaling servers are available
* Very little server load
* Not suited for a large amount of collaborators on a single document (each peer is connected to each other)

## Setup

### Install

```sh
npm i y-trystero
```

### Client code

```js
import * as Y from 'yjs'
import { TrysteroProvider } from 'y-trystero'

const ydoc = new Y.Doc()
// clients connected to the same room-name share document updates
const provider = new TrysteroProvider('your-room-name', ydoc, trysteroRoom, { password: 'optional-room-password' })
const yarray = ydoc.get('array', Y.Array)
```
### Communication Restrictions

y-trystero is restricted by the number of peers that the web browser can create. By default, every client is connected to every other client up until the maximum number of conns is reached. The clients will still sync if every client is connected at least indirectly to every other client. Theoretically, y-trystero allows an unlimited number of users, but at some point it can't be guaranteed anymore that the clients sync any longer**. Because we don't want to be greedy,
y-trystero has a restriction to connect to a maximum of `20 + math.floor(random.rand() * 15)` peers. The value has a random factor in order to prevent clients to form clusters, that can't connect to other clients. The value can be adjusted using the `maxConn` option. I.e.

```js
const provider = new TrysteroProvider('your-room-name', ydoc, trysteroRoom, { maxConns: 70 + math.floor(random.rand() * 70) })
```

** A gifted mind could use this as an exercise and calculate the probability of clusters forming depending on the number of peers in the network. The default value was used to connect at least 100 clients at a conference meeting on a bad network connection.

### Use y-trystero for conferencing solutions

Just listen to the "peers" event from the provider to listen for more incoming WebRTC connections and use the [Trystero library](https://github.com/dmotz/trystero) to share streams. More help on this would be welcome. By default, browser windows share data using BroadcastChannel without WebRTC. In order to connect all peers and browser windows with each other, set `maxConns = Number.POSITIVE_INFINITY` and `filterBcConns = false`.

## API

```js
new TrysteroProvider(roomName, ydoc, trysteroRoom, [, opts])
```

The following default values of `opts` can be overwritten:

```js
{
  // If password is a string, it will be used to encrypt all communication over the signaling servers.
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
  filterBcConns: true
}
```

## Logging

`y-trystero` uses the `lib0/logging.js` logging library. By default this library disables logging. You can enable it by specifying the `log` environment / localStorage variable:

```js
// enable logging for all modules
localStorage.log = 'true'
// enable logging only for y-trystero
localStorage.log = 'y-trystero'
// by specifying a regex variables
localStorage.log = '^y.*'
```

```sh
# enable y-trystero logging in nodejs
LOG='y-trystero' node index.js
```

## License
Yjs is licensed under the [MIT License](./LICENSE).

<kevin.jahns@pm.me>
