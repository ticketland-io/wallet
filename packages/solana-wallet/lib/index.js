import * as anchor from '@project-serum/anchor'
import * as Bip39 from 'bip39'
import nacl from 'tweetnacl'
import keccak256 from 'keccak256'
import Record from '@ppoliani/im-record'
import Storage from '@ticketland-io/eutopic-indexdb-storage'

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

const init = async (self, mnemonic=Bip39.generateMnemonic()) => {
  const seed = (await Bip39.mnemonicToSeed(mnemonic)).slice(0, 32)
  const account = Keypair.fromSeed(seed)

  self.storage = Storage()

  await self.storage.open()

  const {cipher, iv} = await encryptKey(self, account.secretKey)
  self.accountPrivKey = self.enclave.pack(cipher)
  self.iv = self.enclave.pack(iv)
  self.publicKey = account.publicKey

  return mnemonic
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
