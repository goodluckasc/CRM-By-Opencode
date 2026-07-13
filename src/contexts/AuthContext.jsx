import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db, isFirebaseReady } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setLoading(false)
      setFirebaseReady(false)
      return
    }

    setFirebaseReady(true)

    const init = async () => {
      const { onAuthStateChanged } = await import('firebase/auth')
      const { doc, getDoc, setDoc, Timestamp } = await import('firebase/firestore')

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser)
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            setUserData(docSnap.data())
          } else {
            const newUser = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'User',
              role: 'call_executive',
              isActive: true,
              createdAt: Timestamp.now(),
            }
            await setDoc(docRef, newUser)
            setUserData(newUser)
          }
        } else {
          setUser(null)
          setUserData(null)
        }
        setLoading(false)
      })
      return unsubscribe
    }

    const unsubPromise = init()
    return () => {
      unsubPromise.then((unsub) => {
        if (unsub) unsub()
      })
    }
  }, [])

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured. Create a .env file with your Firebase config.')
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    return signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email, password, displayName) => {
    if (!auth || !db) throw new Error('Firebase not configured. Create a .env file with your Firebase config.')
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth')
    const { doc, setDoc, Timestamp } = await import('firebase/firestore')
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await setDoc(doc(db, 'users', result.user.uid), {
      email,
      displayName,
      role: 'call_executive',
      isActive: true,
      createdAt: Timestamp.now(),
    })
    return result
  }

  const logout = async () => {
    if (!auth) return
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  }

  const isAdmin = userData?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, register, logout, isAdmin, firebaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
