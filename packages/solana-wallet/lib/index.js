import * as anchor from '@project-serum/anchor'
import HDKey from 'hdkey'
import nacl from 'tweetnacl'
import keccak256 from 'keccak256'
import Record from '@ppoliani/im-record'
import Storage from '@ticketland-io/indexdb-storage'

const {Keypair} = anchor.web3

const getAccount = async self => {
  // read the Web Crypto API key from the storage
  const encryption_key = (await self.storage.readKey()).value
  // use the key to decrypt the account priv key
  const decrypted_key = await self.enclave.decrypt(
    self.enclave.unpack(self.accountPrivKey),
    encryption_key,
    self.enclave.unpack(self.iv)
  )

  return Keypair.fromSecretKey(new Uint8Array(decrypted_key.split(',')))
}

const signTransaction = async (self, tx) => {
  tx.partialSign(await getAccount(self))
  
  return tx
}

const signAllTransactions = async (self, txs) => {
  const account = await getAccount(self)

  return txs.map((t) => {
    t.partialSign(account)
    return t
  })
}

const signMessage = async (self, msg) => {
  const keypair =  await getAccount(self)
  return nacl.sign.detached(keccak256(msg), keypair.secretKey) 
}

const encryptKey = async (self, value) => {
  const key = await self.enclave.generateKey()
  await self.storage.writeKey(key)

  return await self.enclave.encrypt(value, key)
}

const createAccount = async (seed, index) => {
  const hdkey = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'));
  const childkey = hdkey.derive(`m/44'/501'/0'/${index}'`);
  return Keypair.fromSeed(childkey.privateKey);
}

const init = async (self, seed) => {
  const account = await createAccount(seed, 0)

  self.storage = Storage()
  await self.storage.open()

  const {cipher, iv} = await encryptKey(self, account.secretKey);
  self.accountPrivKey = self.enclave.pack(cipher);
  self.iv = self.enclave.pack(iv);
  self.publicKey = account.publicKey;
}

const Wallet = Record({
  // must set during creation not initialization!
  enclave: null,

  accountPrivKey: null,
  storage: null,
  iv: null,

  init,
  // Wallet interface
  signTransaction,
  signAllTransactions,
  signMessage,
})

export default Wallet
