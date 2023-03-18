import Record from '@ppoliani/im-record'
import * as account from './account'

const createNewWallet = async (self, vaultClientToken, vaultEntityId) => {
  const custodyWallet = self.Wallet()
  const mnemonic = await custodyWallet.init()
  
  // if it's new then most likely there is no vault encryption key for the given entityId
  await self.vault.createKey(vaultClientToken, vaultEntityId)

  const encryptedMnemonic = await self.vault.encrypt(vaultClientToken, vaultEntityId, mnemonic)
  await self.createAccount(encryptedMnemonic, custodyWallet.publicKey)
  custodyWallet.mnemonic = encryptedMnemonic;

  return custodyWallet
}

const restoreExistingWallet = async (self, mnemonic) => {
  const custodyWallet = self.Wallet()
  await custodyWallet.init(mnemonic)

  return custodyWallet
}

const bootstrap = async (self, currentUser) => {
  const vaultAuthResponse = await self.vault.login(await currentUser.getIdToken())
  const vaultClientToken = vaultAuthResponse.auth.client_token
  const vaultEntityId = vaultAuthResponse.auth.entity_id

  try {
    const account = await self.fetchAccount()
    const mnemonic = await self.vault.decrypt(vaultClientToken, vaultEntityId, account.mnemonic)

    return await restoreExistingWallet(self, atob(mnemonic))
  }
  catch(error) {
    if(error.status == 404) {
      return await createNewWallet(self, vaultClientToken, vaultEntityId)
    }

    throw error
  }
}

const init = (self, walletApi, authProvider) => {
  self.walletApi = walletApi
  self.vault = Vault({vaultApi})
  self.authProvider = authProvider
}

const WalletCore = Record({
  walletApi: '',
  Wallet: null,
  authProvider: null,

  init,
  bootstrap,

  ...account,
})

export default WalletCore
