import {fetch, createBearerHeader} from '@ticketland-io/eutopic-common'

export const fetchAccount = async (self) => {  
  return await fetch(
    `${self.eutopicApi}/accounts`,
    'GET',
    {
      headers: createBearerHeader(await self.authProvider.accessToken())
    }
  )
}

export const createAccount = async (self, mnemonic, pubkey) => {
  return await fetch(
    `${self.eutopicApi}/accounts`,
    'POST',
    {
      body: {
        mnemonic,
        pubkey,
      },
      headers: createBearerHeader(await self.authProvider.accessToken())
    }
  )
}

