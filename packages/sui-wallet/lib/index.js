import {
  Connection,
  Ed25519Keypair,
  JsonRpcProvider,
  RawSigner,
} from '@mysten/sui.js'
import {derivePath} from 'ed25519-hd-key'
import nacl from 'tweetnacl'
import keccak256 from 'keccak256'
import Record from '@ppoliani/im-record'
import Storage from '@ticketland-io/indexdb-storage'

const getSeed = async (self) => {
  // read the Web Crypto API key from the storage
  const encryption_key = (await self.storage.readKey()).value
  // use the key to decrypt the account priv key
  const seed = await self.enclave.decrypt(
    self.enclave.unpack(self.seed),
    encryption_key,
    self.enclave.unpack(self.iv)
  )

  return seed
}

const encryptKey = async (self, value) => {
  const key = await self.enclave.generateKey()
  await self.storage.writeKey(key)

  return await self.enclave.encrypt(value, key)
}

const deriveAccount = async (self, index) => {
  const seed = await getSeed(self)
  const {key} = derivePath(`m/44'/784'/0'/0'/${index}'`, seed)
  const keypair = Ed25519Keypair.fromSecretKey(key)

  return keypair
}

const signMessage = async (self, msg, index = 0) => {
  const account = await deriveAccount(self, index);
  return nacl.sign.detached(keccak256(msg), account.keypair.secretKey);
}

const init = async (self, seed, rpcServer) => {
  self.storage = Storage()
  await self.storage.open()

  const {cipher, iv} = await encryptKey(self, seed)
  self.seed = self.enclave.pack(cipher)
  self.iv = self.enclave.pack(iv)

  const account = await deriveAccount(self, 0)
  self.publicKey = account.getPublicKey()
  self.provider = new JsonRpcProvider(new Connection({fullnode: rpcServer}))
  self.signer = new RawSigner(account, self.provider)
}

const Wallet = Record({
  // must set during creation not initialization!
  enclave: null,
  seed: null,
  publicKey: null,
  storage: null,
  iv: null,
  signer: null,
  provider: null,

  init,
  signMessage,
})

export default Wallet
