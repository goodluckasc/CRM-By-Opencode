import { db, isFirebaseReady } from './config'

const noop = async () => {
  console.warn('Firebase not configured')
  return []
}
const noopSingle = async () => {
  console.warn('Firebase not configured')
  return null
}

let services = {
  customersRef: null,
  callsRef: null,
  usersRef: null,
  auditLogRef: null,
  addCustomer: noopSingle,
  updateCustomer: noopSingle,
  deleteCustomer: noopSingle,
  getCustomer: noopSingle,
  getAllCustomers: noop,
  getDueCustomers: noop,
  addCallRecord: noopSingle,
  updateCallRecord: noopSingle,
  getCustomerCalls: noop,
  getAllCalls: noop,
  addAuditLog: noopSingle,
  addOrUpdateCustomer: noopSingle,
  getUsers: noop,
  getUserByEmail: noopSingle,
  updateUser: noopSingle,
}

if (isFirebaseReady && db) {
  const {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp,
  } = await import('firebase/firestore')

  const customersRef = collection(db, 'customers')
  const callsRef = collection(db, 'calls')
  const usersRef = collection(db, 'users')
  const auditLogRef = collection(db, 'auditLog')

  services = {
    customersRef,
    callsRef,
    usersRef,
    auditLogRef,

    addCustomer: async (data) =>
      addDoc(customersRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalVisits: 1,
      }),

    updateCustomer: async (id, data) =>
      updateDoc(doc(db, 'customers', id), { ...data, updatedAt: Timestamp.now() }),

    addOrUpdateCustomer: async (data) => {
      const mobileQ = query(customersRef, where('mobileNumber', '==', data.mobileNumber))
      const vehicleQ = query(customersRef, where('vehicleNumber', '==', data.vehicleNumber))
      const [mobileSnap, vehicleSnap] = await Promise.all([getDocs(mobileQ), getDocs(vehicleQ)])
      const existing = [...mobileSnap.docs, ...vehicleSnap.docs]
      if (existing.length > 0) {
        const existingDoc = existing[0]
        const existingData = existingDoc.data()
        await updateDoc(doc(db, 'customers', existingDoc.id), {
          ...data,
          updatedAt: Timestamp.now(),
          totalVisits: (existingData.totalVisits || 0) + 1,
        })
        return { action: 'updated', id: existingDoc.id }
      }
      await addDoc(customersRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalVisits: 1,
      })
      return { action: 'added' }
    },

    deleteCustomer: async (id) => deleteDoc(doc(db, 'customers', id)),

    getCustomer: async (id) => getDoc(doc(db, 'customers', id)),

    getAllCustomers: async () => {
      const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')))
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    getDueCustomers: async () => {
      const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')))
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    addCallRecord: async (data) =>
      addDoc(callsRef, { ...data, createdAt: Timestamp.now() }),

    updateCallRecord: async (id, data) =>
      updateDoc(doc(db, 'calls', id), { ...data, updatedAt: Timestamp.now() }),

    getCustomerCalls: async (customerId) => {
      const q = query(callsRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    getAllCalls: async () => {
      const snapshot = await getDocs(query(callsRef, orderBy('createdAt', 'desc')))
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    addAuditLog: async (action, userId, details) => {
      try {
        await addDoc(auditLogRef, { action, userId, details, timestamp: Timestamp.now() })
      } catch (e) {
        console.error('Audit log error:', e)
      }
    },

    getUsers: async () => {
      const snapshot = await getDocs(usersRef)
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    getUserByEmail: async (email) => {
      const q = query(usersRef, where('email', '==', email))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      const d = snapshot.docs[0]
      return { id: d.id, ...d.data() }
    },

    updateUser: async (id, data) =>
      updateDoc(doc(db, 'users', id), data),
  }
}

export const {
  customersRef,
  callsRef,
  usersRef,
  auditLogRef,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomer,
  getAllCustomers,
  getDueCustomers,
  addCallRecord,
  updateCallRecord,
  getCustomerCalls,
  getAllCalls,
  addAuditLog,
  addOrUpdateCustomer,
  getUsers,
  getUserByEmail,
  updateUser,
} = services
