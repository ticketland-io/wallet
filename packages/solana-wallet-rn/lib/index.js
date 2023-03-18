import * as anchor from '@project-serum/anchor'
import * as Bip39 from 'bip39'
import nacl from 'tweetnacl'
import keccak256 from 'keccak256'
import Record from '@ppoliani/im-record'
import EncryptedStorage from 'react-native-encrypted-storage'

const {Keypair} = anchor.web3

const STORAGE_KEY = 'ACCOUNT::PRIVE_KEY'

const getAccount = async self => {
  const result = await EncryptedStorage.getItem(STORAGE_KEY)

  if (result !== undefined) {
    return Keypair.fromSecretKey(
      new Uint8Array(
        Object.values(
          JSON.parse(result).secretKey
        )
      )
    )
  }

  throw new Error('Storage key undefined')
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
  const keypair = await getAccount(self)
  return nacl.sign.detached(keccak256(msg), keypair.secretKey)
}

const encryptKey = async (self, secretKey) => {
  try {
    await EncryptedStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({secretKey})
    );
  } catch (error) {
    throw error
  }
}

const init = async (self, mnemonic = Bip39.generateMnemonic()) => {
  const seed = (await Bip39.mnemonicToSeed(mnemonic)).slice(0, 32)
  const account = Keypair.fromSeed(seed)

  await encryptKey(self, account.secretKey)
  self.publicKey = account.publicKey

  return mnemonic
}

const Wallet = Record({
  init,
  // Wallet interface
  signTransaction,
  signAllTransactions,
  signMessage,
})

export default Wallet
