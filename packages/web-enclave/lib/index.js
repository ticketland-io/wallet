import Record from '@ppoliani/im-record'

const generateKey = async (self) => {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    // make sure extractable is set to false. This way the private key can only be used for decrypting
    // and/or signing messages within the browser - but can not be read (even by client-side scripting in the browser)
    false,
    ['encrypt', 'decrypt']
  )
}

const encode = (data) => {
  const encoder = new TextEncoder()
  return encoder.encode(data)
}

const generateIv = () => {
  // https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
  return window.crypto.getRandomValues(new Uint8Array(12))
}

const encrypt = async (self, data, key) => {
  const encoded = encode(data)
  const iv = generateIv()

  const cipher = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv,
  }, key, encoded)

  return {cipher, iv}
}

const pack = (self, buffer) => {
  return window.btoa(
    String.fromCharCode.apply(null, new Uint8Array(buffer))
  )
}

const unpack = (self, packed) => {
  const string = window.atob(packed)
  const buffer = new ArrayBuffer(string.length)
  const bufferView = new Uint8Array(buffer)
  
  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i)
  }

  return buffer
}

const decode = (bytestream) => {
  const decoder = new TextDecoder()
  return decoder.decode(bytestream)
}

const decrypt = async (self, cipher, key, iv) => {
  const encoded = await window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv,
  }, key, cipher)
  return decode(encoded)
}

const Enclave = Record({
  generateKey,
  encrypt,
  decrypt,
  pack,
  unpack,
})

export default Enclave
