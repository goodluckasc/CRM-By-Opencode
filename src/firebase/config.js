const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const hasConfig = Object.values(firebaseConfig).every(Boolean)

if (!hasConfig) {
  console.warn(
    '%c⚠️ Firebase not configured. Create a .env file with your Firebase config variables. See .env.example',
    'color: #f59e0b; font-size: 14px; font-weight: bold;'
  )
}

let app = null
let auth = null
let db = null

const firebaseReady = hasConfig
  ? (async () => {
      const { initializeApp } = await import('firebase/app')
      const { getAuth } = await import('firebase/auth')
      const { getFirestore } = await import('firebase/firestore')
      app = initializeApp(firebaseConfig)
      auth = getAuth(app)
      db = getFirestore(app)
    })()
  : Promise.resolve()

export { app, auth, db, firebaseReady }
export const isFirebaseReady = hasConfig
