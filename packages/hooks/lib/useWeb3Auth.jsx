import {useEffect, useState} from 'react';
import {Web3AuthNoModal} from "@web3auth/no-modal";
import {OpenloginAdapter} from "@web3auth/openlogin-adapter";
import {ADAPTER_EVENTS} from "@web3auth/base";

const noop = () => {}

export default (
  config,
  onError = noop,
  onDisconnected = noop,
  onConnecting = noop,
) => {
  const [web3Auth, setWeb3Auth] = useState(null);
  const {
    clientId,
    verifier,
    chainId,
    chainNamespace,
    rpcTarget,
    sessionTime = 86400 * 7, // 7 days
    web3AuthNetwork = "mainnet",
  } = config;

  useEffect(() => {
    const run = async () => {
      const _web3Auth = new Web3AuthNoModal({
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
      });
      
      _web3Auth.configureAdapter(openloginAdapter);
  
      await _web3Auth.init();

      _web3Auth.on(ADAPTER_EVENTS.CONNECTING, onConnecting);
      _web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, onDisconnected);
      _web3Auth.on(ADAPTER_EVENTS.ERRORED, onError);

      setWeb3Auth(_web3Auth);
    }

    run()
    .then(noop)
    .catch(onError);

  }, [])

  return web3Auth
}
