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
import EncryptedStorage from 'react-native-encrypted-storage'

const STORAGE_KEY = 'ACCOUNT::PRIVE_KEY'

const getSeed = async () => {
  const result = await EncryptedStorage.getItem(STORAGE_KEY)

  if (result !== undefined) {
    return JSON.parse(result).secretKey
  }

  throw new Error('Storage key undefined')
}

const encryptKey = async (secretKey) => {
  try {
    await EncryptedStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({secretKey})
    )
  } catch (error) {
    throw error
  }
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
  await encryptKey(seed)

  const account = await deriveAccount(self, 0)
  self.publicKey = account.getPublicKey()
  self.provider = new JsonRpcProvider(new Connection({fullnode: rpcServer}))
  self.signer = new RawSigner(account, self.provider)
}

const Wallet = Record({
  seed: null,
  publicKey: null,
  signer: null,
  provider: null,

  init,
  signMessage,
})

export default Wallet
