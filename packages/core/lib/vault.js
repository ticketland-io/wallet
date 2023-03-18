import Record from '@ppoliani/im-record'
import {fetch} from '@ticketland-io/eutopic-common'

const createVaultAuthHeader = vaultClientToken => ({
  'X-Vault-Token': vaultClientToken
})

const login = async (self, jwt) => {
  return await fetch(
    `${self.vaultApi}/auth/jwt/login`,
    'POST',
    {
      body: {
        role: 'eutopic-oidc',
        jwt
      }
    }
  )
}

const getKey = async (self, vaultClientToken, vaultEntityId) => {
  return await fetch(
    `${self.vaultApi}/transit/keys/${vaultEntityId}`,
    'GET',
    {
      headers: createVaultAuthHeader(vaultClientToken)
    }
  )
}

const createKey = async (self, vaultClientToken, vaultEntityId) => {
  try {
    const key = await getKey(self, vaultClientToken, vaultEntityId)
    if(key.data.name) return
  }
  catch(error) {
    return await fetch(
      `${self.vaultApi}/transit/keys/${vaultEntityId}`,
      'POST',
      {
        headers: createVaultAuthHeader(vaultClientToken)
      }
    )
  }
}

const encrypt = async (self, vaultClientToken, vaultEntityId, plaintext) => {
  const result = await fetch(
    `${self.vaultApi}/transit/encrypt/${vaultEntityId}`,
    'POST',
    {
      body: {
        plaintext: btoa(plaintext)
      },
      headers: createVaultAuthHeader(vaultClientToken)
    }
  )

  return result.data.ciphertext
}

const decrypt = async (self, vaultClientToken, vaultEntityId, ciphertext) => {
  const result = await fetch(
    `${self.vaultApi}/transit/decrypt/${vaultEntityId}`,
    'POST',
    {
      body: {ciphertext},
      headers: createVaultAuthHeader(vaultClientToken)
    }
  )
  
  return result.data.plaintext
}

const Vault = Record({
  vaultApi: '',
  login,
  getKey,
  createKey,
  encrypt,
  decrypt,
})

export default Vault
