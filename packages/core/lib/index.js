import Record from '@ppoliani/im-record'
import {Web3AuthNoModal} from "@web3auth/no-modal";
import {OpenloginAdapter} from "@web3auth/openlogin-adapter";
import {ADAPTER_EVENTS, WALLET_ADAPTERS} from "@web3auth/base";
import * as account from './account'

const noop = () => {}

const isConnected = async (self) => {
  try {
    const user = await self.web3Auth.getUserInfo();
    return Boolean(user)
  } catch(_) {
    return false
  }
}

const createNewWallet = async (self) => {
  await initWeb3Auth(self, undefined);

  const user = await self.web3Auth.getUserInfo();
  const seed = await self.web3Auth.provider.request({method: "private_key"});
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed);
  
  // create the user on the back end
  await self.createAccount(user.dappShare, custodyWallet.publicKey.toSuiAddress())

  return custodyWallet;
}

const restoreExistingWallet = async (self, dappShare) => {
  await initWeb3Auth(self, dappShare)

  const seed = await self.web3Auth.provider.request({method: "private_key"});
  const custodyWallet = self.Wallet()
  await custodyWallet.init(seed)

  return custodyWallet
}

const initWeb3Auth = async (self, dappShare) => {
  const {
    clientId,
    verifier,
    chainNamespace,
    sessionTime = 86400 * 7, // 7 days
    web3AuthNetwork = "mainnet",
  } = self.web3AuthConfig;

  const web3Auth = new Web3AuthNoModal({
    authMode: 'DAPP',
    clientId,
    chainConfig: {chainNamespace},
    sessionTime,
    web3AuthNetwork,
    useCoreKitKey: false,
  });

  const openloginAdapter = new OpenloginAdapter({
    adapterSettings: {
      clientId,
      uxMode: "redirect",
      network: web3AuthNetwork,
      loginConfig: {
        jwt: {
          verifier,
          typeOfLogin: "jwt",
          clientId,
        },
      },
    },
    loginSettings: {
      mfaLevel: 'mandatory',
      dappShare,
    }
  });
  
  web3Auth.configureAdapter(openloginAdapter);

  await web3Auth.init();
  self.web3Auth = web3Auth;

  self.web3Auth.on(ADAPTER_EVENTS.CONNECTING, () => self.onEvent(ADAPTER_EVENTS.CONNECTING));
  self.web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, () => self.onEvent(ADAPTER_EVENTS.DISCONNECTED));
  self.web3Auth.on(ADAPTER_EVENTS.ERRORED, (error) => self.onEvent(ADAPTER_EVENTS.ERRORED, error));

  // check if user is already connected. If that's the case we don't have to call connectTo
  if (!await isConnected(self)) {
    // Connect auth 2.0 account with web3Auth
    await self.web3Auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
      loginProvider: "jwt",
      extraLoginOptions: {
        id_token: await self.authProvider.getIdToken(),
        verifierIdField: "sub", // same as your JWT Verifier ID
        domain: self.web3AuthConfig.domain,
      },
    });
  }
}

const logout = async (self) => {
  try {
    if (await isConnected(self)) {
      await self.web3Auth.logout()
    }
  }
  catch(error) {
    // ignore
  }
}

const bootstrap = async (self) => {
  try {
    const account = await self.fetchAccount()
    return await restoreExistingWallet(self, account.dapp_share)
  }
  catch(error) {
    if(error.status == 404) {
      return await createNewWallet(self)
    }

    throw error
  }
}

const init = (
  self,
  walletApi,
  authProvider,
  web3AuthConfig,
  onEvent = noop,
) => {
  self.walletApi = walletApi;
  self.authProvider = authProvider;
  self.web3AuthConfig = web3AuthConfig;
  self.onEvent = onEvent;
}

export const WalletCore = Record({
  walletApi: '',
  Wallet: null,
  authProvider: null,
  web3Auth: null,
  web3AuthConfig: null,
  
  init,
  bootstrap,
  logout,

  ...account,
});

export * as constants from './constants'
