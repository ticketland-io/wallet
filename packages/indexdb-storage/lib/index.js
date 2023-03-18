import Record from '@ppoliani/im-record'

const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

// this is a fixed id; we want just one entry anyways
const KEY_ID = '@@ticketland'
const DB_NAME = 'ticketland_db'

const open = (self) => new Promise((res, rej) => {
  const request = indexedDB.open(DB_NAME)

  request.onerror = rej

  request.onsuccess = event => {
    self.db = event.target.result

    res()
  }

  request.onupgradeneeded = () => {
    self.db = request.result

    if (!self.db.objectStoreNames.contains('keys')) {
      self.db.createObjectStore('keys', {keyPath: 'id'})
    }
  }
})

const writeKey = (self, value) => new Promise((res, rej) => {
  const transaction = self.db.transaction(['keys'], 'readwrite')
  const keys = transaction.objectStore('keys')

  const key = {
    id: KEY_ID,
    value,
    created: new Date()
  };

  const request = keys.put(key)

  request.onsuccess = () => res(request.result)
  request.onerror = () => rej(request.error)
})

const readKey = (self) => new Promise((res, rej) => {
  const transaction = self.db.transaction(['keys'], 'readwrite')
  const keys = transaction.objectStore('keys')
  const request = keys.get(KEY_ID)

  request.onsuccess = () => {
    if (request.result !== undefined) {
      res(request.result)
    } else {
      res(null)
    }
  }
  request.onerror = () => rej(request.error)
})

const Storage = Record({
  db: null,

  open,
  writeKey,
  readKey,
})

export default Storage
