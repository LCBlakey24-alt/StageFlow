const DB_NAME = 'stageflow-local-media';
const STORE = 'evidence';
const DB_VERSION = 1;
export const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024;

function ownerKey(lessonId, learnerId) {
  return `${lessonId}::${learnerId}`;
}

function openDb() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE)
        ? request.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath: 'id' });
      if (!store.indexNames.contains('ownerKey')) store.createIndex('ownerKey', 'ownerKey', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local evidence storage'));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local evidence storage failed'));
  });
}

export async function listLocalEvidence(lessonId, learnerId) {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('ownerKey');
    const records = await requestToPromise(index.getAll(ownerKey(lessonId, learnerId)));
    return (records || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  } finally {
    db.close();
  }
}

export async function saveLocalEvidence(file, lessonId, learnerId) {
  if (!file) throw new Error('Choose a photo or video first');
  if (!String(file.type || '').startsWith('image/') && !String(file.type || '').startsWith('video/')) {
    throw new Error('Only photos and videos are supported');
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new Error('Keep each photo or video under 50 MB for this demo');
  }

  const db = await openDb();
  if (!db) throw new Error('This browser cannot store local media evidence');

  const id = window.crypto?.randomUUID?.() || `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    ownerKey: ownerKey(lessonId, learnerId),
    lessonId,
    learnerId,
    name: file.name || (String(file.type).startsWith('video/') ? 'Video evidence' : 'Photo evidence'),
    type: file.type || '',
    size: file.size || 0,
    createdAt: new Date().toISOString(),
    blob: file
  };

  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STORE).put(record));
    return record;
  } finally {
    db.close();
  }
}

export async function deleteLocalEvidence(id) {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}
