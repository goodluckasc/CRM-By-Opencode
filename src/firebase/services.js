import { db, isFirebaseReady, firebaseReady } from './config'

const noop = async () => {
  console.warn('Firebase not configured')
  return []
}
const noopSingle = async () => {
  console.warn('Firebase not configured')
  return null
}

const services = {
  customersRef: null,
  callsRef: null,
  usersRef: null,
  auditLogRef: null,
  addCustomer: noopSingle,
  updateCustomer: noopSingle,
  deleteCustomer: noopSingle,
  getCustomer: noopSingle,
  getAllCustomers: noop,
  getCustomersCount: noop,
  getCustomersPage: noopSingle,
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

let initialized = false

async function init() {
  if (initialized) return
  if (!isFirebaseReady || !db) return

  await firebaseReady

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
    limit,
    startAfter,
    Timestamp,
  } = await import('firebase/firestore')

  const customersRef = collection(db, 'customers')
  const callsRef = collection(db, 'calls')
  const usersRef = collection(db, 'users')
  const auditLogRef = collection(db, 'auditLog')

  services.customersRef = customersRef
  services.callsRef = callsRef
  services.usersRef = usersRef
  services.auditLogRef = auditLogRef

  services.addCustomer = (data) =>
    addDoc(customersRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      totalVisits: 1,
    })

  services.updateCustomer = (id, data) =>
    updateDoc(doc(db, 'customers', id), { ...data, updatedAt: Timestamp.now() })

  services.addOrUpdateCustomer = async (data) => {
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
  }

  services.deleteCustomer = (id) => deleteDoc(doc(db, 'customers', id))

  services.getCustomer = (id) => getDoc(doc(db, 'customers', id))

  services.getAllCustomers = async () => {
    const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.getCustomersCount = async () => {
    const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')))
    return snapshot.size
  }

  services.getCustomersPage = async (pageLimit, lastDoc) => {
    let q = query(customersRef, orderBy('createdAt', 'desc'), limit(pageLimit))
    if (lastDoc) q = query(q, startAfter(lastDoc))
    const snapshot = await getDocs(q)
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    return { data: docs, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null }
  }

  services.getDueCustomers = async () => {
    const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.addCallRecord = (data) =>
    addDoc(callsRef, { ...data, createdAt: Timestamp.now() })

  services.updateCallRecord = (id, data) =>
    updateDoc(doc(db, 'calls', id), { ...data, updatedAt: Timestamp.now() })

  services.getCustomerCalls = async (customerId) => {
    const q = query(callsRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.getAllCalls = async () => {
    const snapshot = await getDocs(query(callsRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.addAuditLog = async (action, userId, details) => {
    try {
      await addDoc(auditLogRef, { action, userId, details, timestamp: Timestamp.now() })
    } catch (e) {
      console.error('Audit log error:', e)
    }
  }

  services.getUsers = async () => {
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.getUserByEmail = async (email) => {
    const q = query(usersRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() }
  }

  services.updateUser = (id, data) =>
    updateDoc(doc(db, 'users', id), data)

  initialized = true
}

const initPromise = init()

function wrap(fn) {
  return async (...args) => {
    await initPromise
    return fn(...args)
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
  getCustomersCount,
  getCustomersPage,
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
} = {
  get customersRef() { return services.customersRef },
  get callsRef() { return services.callsRef },
  get usersRef() { return services.usersRef },
  get auditLogRef() { return services.auditLogRef },
  addCustomer: wrap((...args) => services.addCustomer(...args)),
  updateCustomer: wrap((...args) => services.updateCustomer(...args)),
  deleteCustomer: wrap((...args) => services.deleteCustomer(...args)),
  getCustomer: wrap((...args) => services.getCustomer(...args)),
  getAllCustomers: wrap((...args) => services.getAllCustomers(...args)),
  getCustomersCount: wrap((...args) => services.getCustomersCount(...args)),
  getCustomersPage: wrap((...args) => services.getCustomersPage(...args)),
  getDueCustomers: wrap((...args) => services.getDueCustomers(...args)),
  addCallRecord: wrap((...args) => services.addCallRecord(...args)),
  updateCallRecord: wrap((...args) => services.updateCallRecord(...args)),
  getCustomerCalls: wrap((...args) => services.getCustomerCalls(...args)),
  getAllCalls: wrap((...args) => services.getAllCalls(...args)),
  addAuditLog: wrap((...args) => services.addAuditLog(...args)),
  addOrUpdateCustomer: wrap((...args) => services.addOrUpdateCustomer(...args)),
  getUsers: wrap((...args) => services.getUsers(...args)),
  getUserByEmail: wrap((...args) => services.getUserByEmail(...args)),
  updateUser: wrap((...args) => services.updateUser(...args)),
}
