import {NativeModules} from 'react-native'
import Record from '@ppoliani/im-record'
import auth from '@react-native-firebase/auth'
import jwt_decode from "jwt-decode";
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import {appleAuth} from '@invertase/react-native-apple-authentication';

const {RNTwitterSignIn} = NativeModules;
RNTwitterSignIn.init('dk0aQKfsCfc9eH2l8A2NPEdio', 'h2tnRBEsSmCm72Xa9d1o3Ss7L5YNHlkoY7MRMPjIgHglgfLNLU')
GoogleSignin.configure({webClientId: '711003129445-2js3agurj1cg8vleo0s4o4reppep444u.apps.googleusercontent.com'});

const signInWithCredential = async (credential, email) => {
  const [provider] = await auth().fetchSignInMethodsForEmail(email)

  if (!provider || credential.providerId === provider) {
    return auth().signInWithCredential(credential)
  } else {
    const error = new Error('User already singed up with a different provider')
    error.data = {provider: provider}

    throw error

  }
}

const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  const {idToken} = await GoogleSignin.signIn();
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

  const data = jwt_decode(idToken)

  return signInWithCredential(googleCredential, data.email);
}

const signInWithFacebook = async () => {
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

  if (result.isCancelled) {
    throw 'User cancelled the login process';
  }

  const data = await AccessToken.getCurrentAccessToken();

  if (!data) {
    throw 'Something went wrong obtaining access token';
  }

  const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);

  /*
  The email field doesn't get retrieved even if the [..., 'email', ...] permission will be request. 
  In fact, the email field doesn't exist in the native Java SDK provided by Facebook at the moment so we need to fetch it manually
  */
  const response = await fetch(`https://graph.facebook.com/v2.5/me?fields=email,name,friends&access_token=${data.accessToken}`)
  const responseData = await response.json()

  return signInWithCredential(facebookCredential, responseData.email);
}

const signInWithAppleId = async () => {
  // Start the sign-in request
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  // Ensure Apple returned a user identityToken
  if (!appleAuthRequestResponse.identityToken) {
    throw new Error('Apple Sign-In failed - no identify token returned');
  }

  // Create a Firebase credential from the response
  const {identityToken, nonce} = appleAuthRequestResponse;
  const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

  const data = jwt_decode(appleAuthRequestResponse.identityToken)

  // Sign the user in with the credential
  return signInWithCredential(appleCredential, data.email);
}

const signInWithTwitter = async () => {
  // Perform the login request
  const {authToken, authTokenSecret, email} = await RNTwitterSignIn.logIn();

  // Create a Twitter credential with the tokens
  const twitterCredential = auth.TwitterAuthProvider.credential(authToken, authTokenSecret);

  // Sign-in the user with the credential
  return signInWithCredential(twitterCredential, email);
}

const curAuth = auth()

const getIdToken = async (forceRefresh = true) => {
  return await curAuth.currentUser.getIdToken(forceRefresh)
}

const accessToken = async () => {
  const now = Date.now() / 1000
  const idToken = await curAuth.currentUser.getIdToken()
  const token = jwt_decode(idToken)

  if (now > token.exp) {
    await getIdToken()
  }

  return idToken
}

const onUserChanged = (_, ...args) => curAuth.onIdTokenChanged(...args)
const signOutUser = async () => await curAuth.signOut()

const Auth = Record({
  signInWithGoogle,
  signInWithFacebook,
  signInWithTwitter,
  signInWithAppleId,
  signOutUser,
  onUserChanged,
  accessToken,
  getIdToken
})

export default Auth
