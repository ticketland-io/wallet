import Record from '@ppoliani/im-record';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import Web3Auth, {LOGIN_PROVIDER, OPENLOGIN_NETWORK} from '@web3auth/react-native-sdk';
import * as account from './account';

const createNewWallet = async (self) => {
  await initWeb3Auth(self, undefined);
  const seed = self.webAuthState.privKey;
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed);

  // create the user on the back end
  await self.createAccount(
    self.webAuthState.userInfo.dappShare,
    custodyWallet.publicKey.toBase58()
  );

  return custodyWallet;
}

const restoreExistingWallet = async (self, dappShare) => {
  await initWeb3Auth(self, dappShare);

  const seed = self.webAuthState.privKey;
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed);

  return custodyWallet;
}

const initWeb3Auth = async (self, dappShare) => {
  const {
    clientId,
    verifier,
    domain,
    scheme = 'io.ticketland.app',
    network = OPENLOGIN_NETWORK.MAINNET,
    sessionTime = 86400 * 7,
  } = self.web3AuthConfig;

  const redirectUrl = `${scheme}://openlogin`;

  const web3Auth = new Web3Auth(WebBrowser, {
    clientId,
    network,
    loginConfig: {
      jwt: {
        verifier,
        typeOfLogin: 'jwt',
        clientId,
      },
    },
  });

  self.webAuthState = await web3Auth.login({
    loginProvider: LOGIN_PROVIDER.JWT,
    redirectUrl,
    dappShare,
    mfaLevel: 'mandatory',
    sessionTime,
    extraLoginOptions: {
      id_token: await self.authProvider.getIdToken(),
      verifierIdField: 'sub',
    },
  });
}

const bootstrap = async (self) => {
  try {
    const account = await self.fetchAccount();
    return await restoreExistingWallet(self, account.dapp_share);
  }
  catch(error) {
    if(error.status == 404) {
      return await createNewWallet(self);
    }

    throw error
  }
}

const init = (
  self,
  walletApi,
  authProvider,
  web3AuthConfig,
) => {
  self.walletApi = walletApi;
  self.authProvider = authProvider;
  self.web3AuthConfig = web3AuthConfig;
}

export const WalletCore = Record({
  walletApi: '',
  Wallet: null,
  authProvider: null,
  webAuthState: null,
  web3AuthConfig: null,
  
  init,
  bootstrap,

  ...account,
});

export * as constants from './constants';
