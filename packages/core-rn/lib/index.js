import EncryptedStorage from 'react-native-encrypted-storage';
import Record from '@ppoliani/im-record';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import Web3Auth, {LOGIN_PROVIDER, OPENLOGIN_NETWORK} from '@ticketland-io/web3auth-rn';
import * as account from './account';

const createNewWallet = async (self) => {
  await initWeb3Auth(self, undefined);
  const seed = self.webAuthState.ed25519PrivKey;
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

  const seed = self.webAuthState.ed25519PrivKey;
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed);

  return custodyWallet;
}

const initWeb3Auth = async (self, dappShare) => {
  const {
    clientId,
    verifier,
    scheme = 'io.ticketland.app',
    network = OPENLOGIN_NETWORK.MAINNET,
    sessionTime = 86400 * 7,
  } = self.web3AuthConfig;

  const redirectUrl = `${scheme}://openlogin`;

  const web3Auth = new Web3Auth(WebBrowser, EncryptedStorage, {
    clientId,
    network,
    loginConfig: {
      clientId,
      verifier,
      typeOfLogin: 'jwt',
      jwtParameters: {
        client_id: clientId
      },
    },
  });

  const state = await web3Auth.init()

  if (state) {
    self.webAuthState = state
  } else {
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
}

const logout = async (self) => {
  try {
    const {clientId} = self.web3AuthConfig;

    await self.web3Auth.logout({clientId})
  }
  catch(error) {
    // ignore
  }
}

const bootstrap = async (self) => {
  try {
    const account = await self.fetchAccount();
    return await restoreExistingWallet(self, account.dapp_share);
  }
  catch (error) {
    if (error.status == 404) {
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
  logout,

  ...account,
});

export * as constants from './constants';
