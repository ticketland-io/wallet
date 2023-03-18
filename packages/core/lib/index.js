import Record from '@ppoliani/im-record'
import {Web3AuthNoModal} from "@web3auth/no-modal";
import {OpenloginAdapter} from "@web3auth/openlogin-adapter";
import {ADAPTER_EVENTS, WALLET_ADAPTERS} from "@web3auth/base";
import * as account from './account'

const noop = () => {}

const createNewWallet = async (self) => {
  await initWeb3Auth(self, undefined);

  // Connect auth 2.0 account with web3Auth
  await self.web3Auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
    loginProvider: "jwt",
    extraLoginOptions: {
      id_token: await self.authProvider.getIdToken(),
      verifierIdField: "sub", // same as your JWT Verifier ID
      domain: self.web3AuthConfig.domain,
    },
  });

  // create the user on the back end
  const user = await self.web3Auth.getUserInfo();
  await self.createAccount(user.dappShare, custodyWallet.publicKey)

  const seed = await self.web3Auth.provider.request({method: "solanaPrivateKey", params: {}});
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed);

  return custodyWallet;
}

const restoreExistingWallet = async (self, dappShare) => {
  await initWeb3Auth(self, dappShare)

  const seed = await self.web3Auth.provider.request({method: "solanaPrivateKey", params: {}});
  const custodyWallet = self.Wallet()
  await custodyWallet.init(seed)

  return custodyWallet
}

const initWeb3Auth = async (self, dappShare) => {
  const {
    clientId,
    verifier,
    chainId,
    chainNamespace,
    rpcTarget,
    sessionTime = 86400 * 7, // 7 days
    web3AuthNetwork = "mainnet",
  } = self.web3AuthConfig;


  const web3Auth = new Web3AuthNoModal({
    authMode: 'DAPP',
    clientId,
    chainConfig: {chainNamespace, chainId, rpcTarget},
    sessionTime,
    web3AuthNetwork,
    useCoreKitKey: false,
  });

  const openloginAdapter = new OpenloginAdapter({
    adapterSettings: {
      clientId,
      uxMode: "redirect",
      network: web3AuthNetwork,
      mfaLevel: 'mandatory',
      loginConfig: {
        jwt: {
          verifier,
          typeOfLogin: "jwt",
          clientId,
        },
      },
    },
    loginSettings: {
      dappShare,
    }
  });
  
  web3Auth.configureAdapter(openloginAdapter);

  await web3Auth.init();
  self.web3Auth = web3Auth;

  self.web3Auth.on(ADAPTER_EVENTS.CONNECTING, () => self.onEvent(ADAPTER_EVENTS.CONNECTING));
  self.web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, () => self.onEvent(ADAPTER_EVENTS.DISCONNECTED));
  self.web3Auth.on(ADAPTER_EVENTS.ERRORED, (error) => self.onEvent(ADAPTER_EVENTS.ERRORED, error));
}

const bootstrap = async (self) => {
  try {
    const account = await self.fetchAccount()
    return await restoreExistingWallet(self, account.dappShare)
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

  ...account,
});

export * as constants from './constants'
