// import * as anchor from '@project-serum/anchor'
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
import Storage from '@ticketland-io/indexdb-storage'

// const {Keypair} = anchor.web3

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

const signTransaction = async (self, tx, index = 0) => {
  const account = await deriveAccount(self, index);
  tx.partialSign(account);
  
  return tx;
}

const signAllTransactions = async (self, txs, index = 0) => {
  const account = await deriveAccount(self, index);

  return txs.map((t) => {
    t.partialSign(account);
    return t;
  });
}

const signMessage = async (self, msg, index = 0) => {
  const account = await deriveAccount(self, index);
  return nacl.sign.detached(keccak256(msg), account.secretKey);
}

const encryptKey = async (self, value) => {
  const key = await self.enclave.generateKey();
  await self.storage.writeKey(key);

  return await self.enclave.encrypt(value, key);
}

const deriveAccount = async (self, index) => {
  const seed = await getSeed(self);
  const {key} = derivePath(`m/44'/784'/0'/0'/${index}'`, seed);
  const keypair = Ed25519Keypair.fromSecretKey(key)

  return keypair
}

const init = async (self, seed) => {
  self.storage = Storage();
  await self.storage.open();

  const {cipher, iv} = await encryptKey(self, seed);
  self.seed = self.enclave.pack(cipher);
  self.iv = self.enclave.pack(iv);

  const account = await deriveAccount(self, 0);
  self.publicKey = account.getPublicKey();
}

const Wallet = Record({
  // must set during creation not initialization!
  enclave: null,
  seed: null,
  publicKey: null,
  storage: null,
  iv: null,

  init,
  // Wallet interface
  signTransaction,
  signAllTransactions,
  signMessage,
})

export default Wallet
