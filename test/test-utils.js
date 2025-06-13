/**
 * Creates a mock Trystero room for testing
 * @returns {object} Mock Trystero room
 */
export const createMockTrysteroRoom = () => {
  const subscribers = []
  
  return {
    makeAction: (name) => {
      const actionSubscribers = []
      
      return [
        (data, peerId) => {
          actionSubscribers.forEach(cb => cb(data, peerId))
        },
        (callback) => {
          actionSubscribers.push(callback)
          return () => {
            const index = actionSubscribers.indexOf(callback)
            if (index !== -1) actionSubscribers.splice(index, 1)
          }
        }
      ]
    },
    onPeerJoin: (callback) => {
      subscribers.push({ type: 'join', callback })
      return () => {
        const index = subscribers.findIndex(s => s.callback === callback)
        if (index !== -1) subscribers.splice(index, 1)
      }
    },
    onPeerLeave: (callback) => {
      subscribers.push({ type: 'leave', callback })
      return () => {
        const index = subscribers.findIndex(s => s.callback === callback)
        if (index !== -1) subscribers.splice(index, 1)
      }
    },
    _triggerPeerJoin: (peerId) => {
      subscribers
        .filter(s => s.type === 'join')
        .forEach(s => s.callback(peerId))
    },
    _triggerPeerLeave: (peerId) => {
      subscribers
        .filter(s => s.type === 'leave')
        .forEach(s => s.callback(peerId))
    }
  }
}

/**
 * Waits for a condition to be true
 * @param {() => boolean} condition
 * @param {number} timeout
 * @param {number} interval
 * @returns {Promise<void>}
 */
export const waitFor = (condition, timeout = 1000, interval = 50) => {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (condition()) {
        resolve()
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for condition'))
      } else {
        setTimeout(check, interval)
      }
    }
    check()
  })
}
