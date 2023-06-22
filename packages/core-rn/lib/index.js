import EncryptedStorage from 'react-native-encrypted-storage';
import Record from '@ppoliani/im-record';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import Web3Auth, {LOGIN_PROVIDER, OPENLOGIN_NETWORK} from '@web3auth/react-native-sdk';
import * as account from './account';

const createNewWallet = async (self, rpcServer) => {
  await initWeb3Auth(self, undefined);
  const seed = self.webAuthState.privKey;
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed, rpcServer);

  // create the user on the back end
  await self.createAccount(
    self.webAuthState.userInfo.dappShare,
    custodyWallet.publicKey.toSuiAddress()
  );

  return custodyWallet;
}

const restoreExistingWallet = async (self, dappShare, rpcServer) => {
  await initWeb3Auth(self, dappShare);

  const seed = self.webAuthState.privKey;
  const custodyWallet = self.Wallet();
  await custodyWallet.init(seed, rpcServer);

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
      jwt: {
        verifier,
        typeOfLogin: 'jwt',
        clientId,
      },
    },
  });

  await web3Auth.init()

  if (web3Auth.state?.privKey) {
    self.webAuthState = web3Auth.state
  } else {
    await web3Auth.login({
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

    self.webAuthState = web3Auth.state
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

const bootstrap = async (self, rpcServer) => {
  try {
    const account = await self.fetchAccount();
    return await restoreExistingWallet(self, account.dapp_share, rpcServer);
  }
  catch (error) {
    if (error.status == 404) {
      return await createNewWallet(self, rpcServer);
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
