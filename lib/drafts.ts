// Spec US4.3: unfinished visits are kept encrypted on the device (SecureStore) and cleared at sign-out.
// One key per patient plus an index of keys, so sign-out can wipe them all.
import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'visit_draft_index';
const keyFor = (patientId: string) => `visit_draft_${patientId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

async function readIndex(): Promise<string[]> {
  try {
    return JSON.parse((await SecureStore.getItemAsync(INDEX_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

export async function saveDraft<T>(patientId: string, draft: T): Promise<void> {
  const key = keyFor(patientId);
  await SecureStore.setItemAsync(key, JSON.stringify(draft));
  const index = await readIndex();
  if (!index.includes(key)) await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...index, key]));
}

export async function loadDraft<T>(patientId: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(patientId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function deleteDraft(patientId: string): Promise<void> {
  const key = keyFor(patientId);
  await SecureStore.deleteItemAsync(key);
  const index = await readIndex();
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index.filter((k) => k !== key)));
}

export async function hasAnyDrafts(): Promise<boolean> {
  return (await readIndex()).length > 0;
}

export async function clearAllDrafts(): Promise<void> {
  for (const key of await readIndex()) await SecureStore.deleteItemAsync(key).catch(() => {});
  await SecureStore.deleteItemAsync(INDEX_KEY).catch(() => {});
}
