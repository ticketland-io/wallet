import {
  Connection,
  Ed25519Keypair,
  JsonRpcProvider,
  RawSigner,
  TransactionBlock,
  fromB64,
} from '@mysten/sui.js';
import {derivePath} from 'ed25519-hd-key'
import nacl from 'tweetnacl'
import keccak256 from 'keccak256'
import Record from '@ppoliani/im-record'
import EncryptedStorage from 'react-native-encrypted-storage'

// const {Keypair} = anchor.web3

const STORAGE_KEY = 'ACCOUNT::PRIVE_KEY'

const getSeed = async () => {
  const result = await EncryptedStorage.getItem(STORAGE_KEY);

  if (result !== undefined) {
    return JSON.parse(result).secretKey;
  }

  throw new Error('Storage key undefined');
}

const signTransaction = async (self, tx, index = 0) => {
  const account = await deriveAccount(self, index);
  tx.partialSign(account);

  return tx
}

const signAllTransactions = async (self, txs, index = 0) => {
  const account = await deriveAccount(self, index);

  return txs.map((t) => {
    t.partialSign(account)
    return t
  })
}

const signMessage = async (self, msg, index = 0) => {
  const account = await deriveAccount(self, index);
  return nacl.sign.detached(keccak256(msg), account.secretKey);
}

const encryptKey = async (secretKey) => {
  try {
    await EncryptedStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({secretKey})
    );
  } catch (error) {
    throw error
  }
}

const deriveAccount = async (self, index) => {
  const seed = await getSeed(self);
  const {key} = derivePath(`m/44'/784'/0'/0'/${index}'`, seed);
  const keypair = Ed25519Keypair.fromSecretKey(key)

  return keypair
}

const init = async (self, seed) => {
  await encryptKey(seed);

  const account = await deriveAccount(self, 0);
  self.publicKey = account.getPublicKey();
}

const Wallet = Record({
  seed: null,
  publicKey: null,

  init,
  // Wallet interface
  signTransaction,
  signAllTransactions,
  signMessage,
})

export default Wallet
