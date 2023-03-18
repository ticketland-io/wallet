import Record from '@ppoliani/im-record'
import {initializeApp} from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  TwitterAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth'
import jwt_decode from "jwt-decode";
export * as Auth from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAzQHN4AyJvbQ4hHogiDQGo0847Hj9HMng",
  authDomain: "ticketland-30727.firebaseapp.com",
  projectId: "ticketland-30727",
  storageBucket: "ticketland-30727.appspot.com",
  messagingSenderId: "711003129445",
  appId: "1:711003129445:web:76576072c268d14ec2288c",
  measurementId: "G-FLNYLRX66Y"
};

const providers = {
  google: new GoogleAuthProvider(),
  twitter: new TwitterAuthProvider(),
  facebook: new FacebookAuthProvider(),
  apple: new OAuthProvider('apple.com')
}

const signInWithGoogle = async () => await signInWithPopup(auth, providers.google)
const signInWithTwitter = async () => await signInWithPopup(auth, providers.twitter)
const signInWithFacebook = async () => await signInWithPopup(auth, providers.facebook)
const signInWithApple = async () => await signInWithPopup(auth, providers.apple)

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

const getIdToken = async (forceRefresh = true) => {
  await auth.currentUser.getIdToken(forceRefresh)
}

const accessToken = async () => {
  const now = Date.now() / 1000
  const token = jwt_decode(auth.currentUser.accessToken)

  if (now > token.exp) {
    await getIdToken()
  }

  return auth.currentUser.accessToken
}

const onUserChanged = (_, ...args) => auth.onIdTokenChanged(...args)
const signOutUser = () => signOut(auth)

const Auth = Record({
  // Auth interface
  accessToken,
  getIdToken,
  onUserChanged,
  signOutUser,
  signInWithGoogle,
  signInWithTwitter,
  signInWithFacebook,
  signInWithApple
})

export default Auth
