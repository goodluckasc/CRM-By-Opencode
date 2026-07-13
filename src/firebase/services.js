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
  jobCardsRef: null,
  inventoryRef: null,
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
  addUser: noopSingle,
  deleteUser: noopSingle,
  getJobCard: noopSingle,
  getAllJobCards: noop,
  addJobCard: noopSingle,
  updateJobCard: noopSingle,
  deleteJobCard: noopSingle,
  getJobCardNumber: noopSingle,
  getAllInventory: noop,
  addInventory: noopSingle,
  updateInventory: noopSingle,
  deleteInventory: noopSingle,
}

let initialized = false

async function init() {
  if (initialized) return
  if (!isFirebaseReady) return
  await firebaseReady
  if (!db) return

  const {
    collection,
    addDoc,
    setDoc,
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
  const jobCardsRef = collection(db, 'jobCards')
  const inventoryRef = collection(db, 'inventory')

  services.customersRef = customersRef
  services.callsRef = callsRef
  services.usersRef = usersRef
  services.auditLogRef = auditLogRef
  services.jobCardsRef = jobCardsRef
  services.inventoryRef = inventoryRef

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

  services.addUser = (data) => {
    const { uid, ...rest } = data
    const userData = { ...rest, isActive: true, createdAt: Timestamp.now() }
    if (uid) return setDoc(doc(db, 'users', uid), userData)
    return addDoc(usersRef, userData)
  }

  services.deleteUser = (id) =>
    deleteDoc(doc(db, 'users', id))

  services.getJobCard = async (id) => {
    const snap = await getDoc(doc(db, 'jobCards', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  services.getAllJobCards = async () => {
    const snapshot = await getDocs(query(jobCardsRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.addJobCard = (data) =>
    addDoc(jobCardsRef, { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })

  services.updateJobCard = (id, data) =>
    updateDoc(doc(db, 'jobCards', id), { ...data, updatedAt: Timestamp.now() })

  services.deleteJobCard = (id) =>
    deleteDoc(doc(db, 'jobCards', id))

  services.getJobCardNumber = async () => {
    const year = new Date().getFullYear()
    const q = query(jobCardsRef, orderBy('createdAt', 'desc'), limit(1))
    const snap = await getDocs(q)
    let next = 1
    if (!snap.empty) {
      const last = snap.docs[0].data().jobCardNumber || ''
      const num = parseInt(last.split('-')[1], 10)
      if (!isNaN(num)) next = num + 1
    }
    return `JC-${String(next).padStart(4, '0')}-${year}`
  }

  services.getAllInventory = async () => {
    const snapshot = await getDocs(query(inventoryRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  services.addInventory = (data) =>
    addDoc(inventoryRef, { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })

  services.updateInventory = (id, data) =>
    updateDoc(doc(db, 'inventory', id), { ...data, updatedAt: Timestamp.now() })

  services.deleteInventory = (id) =>
    deleteDoc(doc(db, 'inventory', id))

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
  jobCardsRef,
  inventoryRef,
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
  addUser,
  deleteUser,
  getJobCard,
  getAllJobCards,
  addJobCard,
  updateJobCard,
  deleteJobCard,
  getJobCardNumber,
  getAllInventory,
  addInventory,
  updateInventory,
  deleteInventory,
} = {
  get customersRef() { return services.customersRef },
  get callsRef() { return services.callsRef },
  get usersRef() { return services.usersRef },
  get auditLogRef() { return services.auditLogRef },
  get jobCardsRef() { return services.jobCardsRef },
  get inventoryRef() { return services.inventoryRef },
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
  addUser: wrap((...args) => services.addUser(...args)),
  deleteUser: wrap((...args) => services.deleteUser(...args)),
  getJobCard: wrap((...args) => services.getJobCard(...args)),
  getAllJobCards: wrap((...args) => services.getAllJobCards(...args)),
  addJobCard: wrap((...args) => services.addJobCard(...args)),
  updateJobCard: wrap((...args) => services.updateJobCard(...args)),
  deleteJobCard: wrap((...args) => services.deleteJobCard(...args)),
  getJobCardNumber: wrap((...args) => services.getJobCardNumber(...args)),
  getAllInventory: wrap((...args) => services.getAllInventory(...args)),
  addInventory: wrap((...args) => services.addInventory(...args)),
  updateInventory: wrap((...args) => services.updateInventory(...args)),
  deleteInventory: wrap((...args) => services.deleteInventory(...args)),
}
