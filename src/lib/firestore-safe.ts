import {
  addDoc as originalAddDoc,
  updateDoc as originalUpdateDoc,
  setDoc as originalSetDoc,
  deleteDoc as originalDeleteDoc,
  getDoc as originalGetDoc,
  getDocs as originalGetDocs,
  onSnapshot as originalOnSnapshot,
  doc as originalDoc,
  collection as originalCollection,
  query as originalQuery,
  getFirestore as originalGetFirestore,
  initializeFirestore as originalInitializeFirestore,
  disableNetwork
} from '@firebase/firestore';

// Re-export everything from the original firestore module
export * from '@firebase/firestore';

// Unique cache keys for collections and docs
const COLLECTION_PREFIX = 'fs_local_coll_';
const DOCUMENT_PREFIX = 'fs_local_doc_';

let activeDbInstance: any = null;

export function initializeFirestore(app: any, settings: any, databaseId?: string) {
  const result = originalInitializeFirestore(app, settings, databaseId);
  activeDbInstance = result;
  if (checkIfQuotaExceeded()) {
    setTimeout(() => disableNetwork(result).catch(() => {}), 0);
  }
  return result;
}

export function getFirestore(app?: any, databaseId?: string) {
  const result = originalGetFirestore(app, databaseId);
  activeDbInstance = result || activeDbInstance;
  return result;
}

// Check if quota-exceeded status is activated
function checkIfQuotaExceeded(): boolean {
  try {
    const isExceeded = localStorage.getItem('fs_quota_exceeded') === 'true';
    if (isExceeded && activeDbInstance) {
      setTimeout(() => {
        try {
          disableNetwork(activeDbInstance).catch(() => {});
        } catch (e) {}
      }, 0);
    }
    return isExceeded;
  } catch {
    return false;
  }
}

function setQuotaExceeded(val: boolean) {
  try {
    localStorage.setItem('fs_quota_exceeded', String(val));
    if (val && activeDbInstance) {
      setTimeout(() => disableNetwork(activeDbInstance).catch(() => {}), 0);
    }
  } catch {}
}

export function collection(firestore: any, pathName: string, ...pathSegments: string[]): any {
  const result = originalCollection(firestore, pathName, ...pathSegments);
  if (result) {
    (result as any).__collectionName__ = pathName;
  }
  return result;
}

export function doc(firestoreOrCollection: any, pathOrId?: string, ...pathSegments: string[]): any {
  const result = (originalDoc as any)(firestoreOrCollection, pathOrId, ...pathSegments);
  if (result) {
    let col = '';
    if (firestoreOrCollection && typeof firestoreOrCollection === 'object') {
      col = (firestoreOrCollection as any).__collectionName__ || (firestoreOrCollection as any).path || '';
    }
    if (!col && pathOrId) {
      col = pathOrId.split('/').filter(Boolean)[0] || '';
    }
    (result as any).__collectionName__ = col;
  }
  return result;
}

export function query(queryInstance: any, ...constraints: any[]): any {
  const result = originalQuery(queryInstance, ...constraints);
  if (result) {
    (result as any).__collectionName__ = queryInstance?.__collectionName__ || queryInstance?.path?.split('/')?.[0] || '';
  }
  return result;
}

// Helpers for local persistence with robust in-memory fallback
const IN_MEMORY_COLLECTIONS: Record<string, any[]> = {};
const IN_MEMORY_DOCUMENTS: Record<string, any> = {};

function getLocalCollection(colPath: string): any[] {
  try {
    const data = localStorage.getItem(`${COLLECTION_PREFIX}${colPath}`);
    return data ? JSON.parse(data) : (IN_MEMORY_COLLECTIONS[colPath] || []);
  } catch {
    return IN_MEMORY_COLLECTIONS[colPath] || [];
  }
}

function saveLocalCollection(colPath: string, items: any[]) {
  IN_MEMORY_COLLECTIONS[colPath] = items;
  try {
    localStorage.setItem(`${COLLECTION_PREFIX}${colPath}`, JSON.stringify(items));
  } catch (err) {
    console.warn(`[Local Storage Quota Full] Falling back to in-memory for collection "${colPath}":`, err);
  }
}

function getLocalDocument(docPath: string): any | null {
  try {
    const data = localStorage.getItem(`${DOCUMENT_PREFIX}${docPath}`);
    return data ? JSON.parse(data) : (IN_MEMORY_DOCUMENTS[docPath] || null);
  } catch {
    return IN_MEMORY_DOCUMENTS[docPath] || null;
  }
}

function saveLocalDocument(docPath: string, data: any) {
  IN_MEMORY_DOCUMENTS[docPath] = data;
  try {
    localStorage.setItem(`${DOCUMENT_PREFIX}${docPath}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Local Storage Quota Full] Falling back to in-memory for document "${docPath}":`, err);
  }
}

function deleteLocalDocument(docPath: string) {
  delete IN_MEMORY_DOCUMENTS[docPath];
  try {
    localStorage.removeItem(`${DOCUMENT_PREFIX}${docPath}`);
  } catch {}
}

// Find the collection name for a given Query or unknown Firestore reference
function findCollectionNameInQuery(ref: any): string {
  if (!ref) return '';
  if (ref.__collectionName__) return ref.__collectionName__;

  // 1. Direct path check
  if (typeof ref.path === 'string' && ref.path) {
    const parts = ref.path.split('/').filter(Boolean);
    return parts[0] || '';
  }

  // 2. Standard collection names to match against
  const knownCollections = [
    'customers', 'companies', 'vehicles', 'reservations', 'rental_payments',
    'activity_logs', 'maintenance_logs', 'refunds', 'insurance_payments',
    'insurance_claims', 'extensions', 'vehicle_damages', 'repairs', 'fines',
    'finances', 'transactions', 'admins', 'notifications', 'notification_tokens'
  ];

  // 3. Scan common SDK properties for query path or query segments
  if (ref._query && ref._query.path) {
    const qPath = ref._query.path.toString();
    if (qPath) {
      const p = qPath.split('/').filter(Boolean)[0];
      if (p) return p;
    }
  }

  if (ref._query?.path?.segments) {
    const segs = ref._query.path.segments;
    if (Array.isArray(segs) && segs.length > 0) {
      return segs[0];
    }
  }

  // 4. Fallback search inside the keys of the object
  try {
    const str = JSON.stringify(ref);
    for (const col of knownCollections) {
      if (str.includes(`"${col}"`)) {
        return col;
      }
    }
  } catch {}

  const visited = new Set<any>();
  function scan(obj: any): string | null {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
    visited.add(obj);

    for (const key in obj) {
      try {
        const val = obj[key];
        if (typeof val === 'string') {
          if (knownCollections.includes(val)) {
            return val;
          }
          const parts = val.split('/').filter(Boolean);
          if (parts.length > 0 && knownCollections.includes(parts[0])) {
            return parts[0];
          }
        } else if (typeof val === 'object' && val !== null) {
          const found = scan(val);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  }

  return scan(ref) || '';
}

// Helper to split any dynamic path to collection and id
function getPathParams(ref: any) {
  let path = '';
  let isDoc = false;
  let colName = '';
  let docId = '';

  if (ref) {
    if (typeof ref.path === 'string' && ref.path !== '') {
      path = ref.path;
      const parts = path.split('/').filter(Boolean);
      isDoc = parts.length % 2 === 0;
      if (isDoc) {
        docId = parts[parts.length - 1];
        colName = parts.slice(0, -1).join('/');
      } else {
        colName = path;
      }
    } else {
      isDoc = ref.type === 'document';
      colName = ref.__collectionName__ || findCollectionNameInQuery(ref);
    }
    
    if (!colName && ref.__collectionName__) {
      colName = ref.__collectionName__;
    }
  }

  return { isDoc, colName, docId, path };
}

// Simulated types to mimic Firestore snapshot classes
class MockDocumentSnapshot {
  id: string;
  ref: any;
  _data: any;
  _exists: boolean;

  constructor(id: string, data: any, ref: any, exists = true) {
    this.id = id;
    this._data = data;
    this.ref = ref;
    this._exists = exists;
  }

  data() {
    return this._data;
  }

  get(field: string) {
    return this._data ? this._data[field] : undefined;
  }

  exists() {
    return this._exists;
  }
}

class MockQuerySnapshot {
  docs: MockDocumentSnapshot[];
  empty: boolean;
  size: number;
  metadata: { fromCache: boolean; hasPendingWrites: boolean };

  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
    this.metadata = { fromCache: true, hasPendingWrites: false };
  }

  forEach(callback: (doc: MockDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// Local collection state modifier routines
function syncAddLocal(colName: string, id: string, data: any) {
  const items = getLocalCollection(colName);
  const idx = items.findIndex(item => item.id === id);
  const record = { id, data, updatedAt: Date.now(), deleted: false };
  if (idx > -1) {
    items[idx] = record;
  } else {
    items.push(record);
  }
  saveLocalCollection(colName, items);
  saveLocalDocument(`${colName}/${id}`, data);
}

function syncUpdateLocal(colName: string, id: string, updateData: any) {
  const items = getLocalCollection(colName);
  const idx = items.findIndex(item => item.id === id);
  
  let mergedData = updateData;
  if (idx > -1) {
    mergedData = { ...items[idx].data, ...updateData };
    items[idx] = { id, data: mergedData, updatedAt: Date.now(), deleted: false };
  } else {
    // try reading document level local
    const existingDoc = getLocalDocument(`${colName}/${id}`);
    if (existingDoc) {
      mergedData = { ...existingDoc, ...updateData };
    }
    items.push({ id, data: mergedData, updatedAt: Date.now(), deleted: false });
  }
  saveLocalCollection(colName, items);
  saveLocalDocument(`${colName}/${id}`, mergedData);
}

function syncDeleteLocal(colName: string, id: string) {
  const items = getLocalCollection(colName);
  const idx = items.findIndex(item => item.id === id);
  if (idx > -1) {
    items[idx] = { id, data: items[idx].data, updatedAt: Date.now(), deleted: true };
  } else {
    items.push({ id, data: {}, updatedAt: Date.now(), deleted: true });
  }
  saveLocalCollection(colName, items);
  deleteLocalDocument(`${colName}/${id}`);
}

// Merge routines to overlay local mutations on top of firestore results
function mergeQueryWithLocal(colName: string, queryDocs: { id: string; data: any }[]): { id: string; data: any }[] {
  const localItems = getLocalCollection(colName);
  const map = new Map<string, { id: string; data: any }>();
  
  // start with firestore items
  queryDocs.forEach(item => {
    map.set(item.id, item);
  });
  
  // overlay local modifications
  localItems.forEach(local => {
    if (local.deleted) {
      map.delete(local.id);
    } else {
      const existing = map.get(local.id);
      if (existing) {
        map.set(local.id, {
          id: local.id,
          data: { ...existing.data, ...local.data }
        });
      } else {
        map.set(local.id, {
          id: local.id,
          data: local.data
        });
      }
    }
  });
  
  return Array.from(map.values());
}

// Overwrite addDoc with graceful quota fallback
export async function addDoc(collectionRef: any, data: any): Promise<any> {
  const { colName } = getPathParams(collectionRef);
  const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // write locally FIRST (optimistic update)
  syncAddLocal(colName, generatedId, data);

  if (checkIfQuotaExceeded()) {
    console.info(`[Quota Safe Mode] Active: Bypassing Firebase SDK for addDoc(${colName})`);
    return {
      id: generatedId,
      path: colName ? `${colName}/${generatedId}` : generatedId,
      parent: collectionRef,
      type: 'document'
    };
  }
  
  try {
    const res = await originalAddDoc(collectionRef, data);
    // If successful, update local to match generated id
    if (res?.id && res.id !== generatedId) {
      syncDeleteLocal(colName, generatedId);
      syncAddLocal(colName, res.id, data);
    }
    return res;
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore addDoc quota exceeded for ${colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore addDoc failed for ${colName} (using fallback). Error:`, error.message);
    }
    // Return mock reference so client doesn't crash
    return {
      id: generatedId,
      path: colName ? `${colName}/${generatedId}` : generatedId,
      parent: collectionRef,
      type: 'document'
    };
  }
}

// Overwrite updateDoc with graceful quota fallback
export async function updateDoc(docRef: any, data: any): Promise<void> {
  const { colName, docId, path } = getPathParams(docRef);
  
  // Write locally FIRST (optimistic update)
  syncUpdateLocal(colName, docId, data);

  if (checkIfQuotaExceeded()) {
    return;
  }
  
  try {
    await originalUpdateDoc(docRef, data);
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore updateDoc quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore updateDoc failed for ${path} (using fallback). Error:`, error.message);
    }
  }
}

// Overwrite setDoc with graceful quota fallback
export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  const { colName, docId, path } = getPathParams(docRef);
  
  // Write locally FIRST (optimistic update)
  if (options && options.merge) {
    syncUpdateLocal(colName, docId, data);
  } else {
    syncAddLocal(colName, docId, data);
  }

  if (checkIfQuotaExceeded()) {
    return;
  }
  
  try {
    await originalSetDoc(docRef, data, options);
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore setDoc quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore setDoc failed for ${path} (using fallback). Error:`, error.message);
    }
  }
}

// Overwrite deleteDoc with graceful quota fallback
export async function deleteDoc(docRef: any): Promise<void> {
  const { colName, docId, path } = getPathParams(docRef);
  
  // Delete locally FIRST (optimistic update)
  syncDeleteLocal(colName, docId);

  if (checkIfQuotaExceeded()) {
    return;
  }
  
  try {
    await originalDeleteDoc(docRef);
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore deleteDoc quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore deleteDoc failed for ${path} (using fallback). Error:`, error.message);
    }
  }
}

// Overwrite getDoc with dynamic local fallback
export async function getDoc(docRef: any): Promise<any> {
  const { colName, docId, path } = getPathParams(docRef);

  if (checkIfQuotaExceeded()) {
    const localOverride = getLocalDocument(path);
    const exists = !!localOverride;
    return new MockDocumentSnapshot(docId, localOverride, docRef, exists);
  }
  
  try {
    const snap = await originalGetDoc(docRef);
    const fsData = snap.exists() ? snap.data() : null;
    const localOverride = getLocalDocument(path);
    
    // Merge firebase result with any local modification
    const finalData = localOverride ? { ...(fsData as any), ...(localOverride as any) } : fsData;
    const exists = !!finalData;
    
    return new MockDocumentSnapshot(docId, finalData, docRef, exists);
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore getDoc quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore getDoc failed for ${path} (reading local fallback). Error:`, error.message);
    }
    const localOverride = getLocalDocument(path);
    const exists = !!localOverride;
    return new MockDocumentSnapshot(docId, localOverride, docRef, exists);
  }
}

// Overwrite getDocs with dynamic local fallback
export async function getDocs(queryRef: any): Promise<any> {
  const { colName } = getPathParams(queryRef);

  if (checkIfQuotaExceeded()) {
    const items = getLocalCollection(colName).filter(x => !x.deleted);
    const docs = items.map(item => new MockDocumentSnapshot(item.id, item.data, doc(queryRef.firestore || queryRef, colName, item.id)));
    return new MockQuerySnapshot(docs);
  }
  
  try {
    const snapshot = await originalGetDocs(queryRef);
    const originalDocs = (snapshot && snapshot.docs) ? snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })) : [];
    
    // Merge with local overrides
    const merged = mergeQueryWithLocal(colName, originalDocs);
    const docs = merged.map(item => new MockDocumentSnapshot(item.id, item.data, doc(queryRef.firestore || queryRef, colName, item.id)));
    
    return new MockQuerySnapshot(docs);
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore getDocs quota exceeded for ${colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Firestore getDocs failed for ${colName} (reading local fallback). Error:`, error.message);
    }
    
    // Absolute fallback: build from local storage
    const items = getLocalCollection(colName).filter(x => !x.deleted);
    const docs = items.map(item => new MockDocumentSnapshot(item.id, item.data, doc(queryRef.firestore || queryRef, colName, item.id)));
    
    return new MockQuerySnapshot(docs);
  }
}

// Overwrite onSnapshot with beautiful stream fallback
export function onSnapshot(
  queryRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void,
  onCompletion?: () => void
): () => void {
  const { isDoc, colName, docId, path } = getPathParams(queryRef);
  
  let unsubscribing = false;
  let originalUnsubscribe: (() => void) | null = null;
  
  // Define fallback emitter in case of active errors or failures
  const emitLocalFallback = () => {
    if (unsubscribing) return;
    try {
      if (isDoc) {
        const localDoc = getLocalDocument(path);
        onNext(new MockDocumentSnapshot(docId, localDoc, queryRef, !!localDoc));
      } else {
        const items = getLocalCollection(colName).filter(x => !x.deleted);
        const docs = items.map(item => new MockDocumentSnapshot(item.id, item.data, queryRef));
        onNext(new MockQuerySnapshot(docs));
      }
    } catch (err) {
      console.error("Local fallback emit failed:", err);
    }
  };

  const registerStorageListener = () => {
    const storageListener = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith(COLLECTION_PREFIX) || e.key.startsWith(DOCUMENT_PREFIX))) {
        emitLocalFallback();
      }
    };
    window.addEventListener('storage', storageListener);
    return () => window.removeEventListener('storage', storageListener);
  };

  if (checkIfQuotaExceeded()) {
    // Run initial emission immediately in microtask
    setTimeout(emitLocalFallback, 0);
    const removeListener = registerStorageListener();
    return () => {
      unsubscribing = true;
      removeListener();
    };
  }

  let removeStorage: (() => void) | null = null;

  try {
    // Attempt standard real-time listener
    originalUnsubscribe = originalOnSnapshot(
      queryRef,
      (snapshot: any) => {
        if (unsubscribing) return;
        try {
          const isDocSnapshot = snapshot && typeof snapshot.exists === 'function';
          if (isDocSnapshot) {
            const fsData = snapshot.exists() ? snapshot.data() : null;
            const localOverride = getLocalDocument(path);
            const finalData = localOverride ? { ...(fsData as any), ...(localOverride as any) } : fsData;
            onNext(new MockDocumentSnapshot(docId, finalData, queryRef, snapshot.exists() || !!localOverride));
          } else {
            const originalDocs = (snapshot && snapshot.docs) ? snapshot.docs.map((doc: any) => ({ id: doc.id, data: doc.data() })) : [];
            const merged = mergeQueryWithLocal(colName, originalDocs);
            const docs = merged.map(item => new MockDocumentSnapshot(item.id, item.data, queryRef));
            onNext(new MockQuerySnapshot(docs));
          }
        } catch (err) {
          console.error("Error processing query snap merge:", err);
          emitLocalFallback();
        }
      },
      (error: any) => {
        const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
        if (isQuota) {
          console.warn(`Firestore onSnapshot quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
          setQuotaExceeded(true);
        } else {
          console.warn(`Firestore onSnapshot stream error for ${path || colName}:`, error.message);
        }
        
        // Failover straight away to localStorage emissions!
        emitLocalFallback();
        
        // Also listen to window storage event for real-time reactivity across component views
        if (!removeStorage) {
          removeStorage = registerStorageListener();
        }
      }
    );
  } catch (error: any) {
    const isQuota = error.message?.includes('Quota exceeded') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`Firestore onSnapshot start quota exceeded for ${path || colName}. Activating safe-fallback mode.`);
      setQuotaExceeded(true);
    } else {
      console.warn(`Failed to open Firestore real-time onSnapshot for ${path || colName}:`, error.message);
    }
    emitLocalFallback();
  }

  // Reactive cross-tab/cross-component localStorage update listener
  if (!removeStorage) {
    removeStorage = registerStorageListener();
  }

  // Return unsubscribe handle
  return () => {
    unsubscribing = true;
    if (removeStorage) {
      removeStorage();
    }
    if (originalUnsubscribe) {
      try {
        originalUnsubscribe();
      } catch {}
    }
  };
}
