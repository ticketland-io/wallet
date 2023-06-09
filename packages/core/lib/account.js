import {fetch, createBearerHeader} from '@ticketland-io/wallet-common'

export const fetchAccount = async (self) => {  
  return await fetch(
    `${self.walletApi}/accounts`,
    'GET',
    {
      headers: createBearerHeader(await self.authProvider.accessToken())
    }
  )
}

export const createAccount = async (self, dappShare, pubkey) => {
  return await fetch(
    `${self.walletApi}/accounts`,
    'POST',
    {
      body: {
        dappShare,
        pubkey,
      },
      headers: createBearerHeader(await self.authProvider.accessToken())
    }
  )
}

