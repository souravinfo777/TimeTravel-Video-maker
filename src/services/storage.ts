import { AppState, SavedProject, Scene } from '../types';

export const PROJECTS_STORAGE_KEY = 'timetravel-streetview-projects-v1';
export const CURRENT_DRAFT_STORAGE_KEY = 'timetravel-streetview-current-draft-v1';

export const DEFAULT_APP_STATE: AppState = {
  startYear: 2000,
  endYear: 2024,
  numImages: 5,
  locationHint: '',
  locationDescription: '',
  charactersEnabled: false,
  numPeople: 1,
  characterNotes: '',
  decayLevel: 50,
  aspectRatio: '16:9',
  imageSize: '1K',
  scenes: [],
  isGeneratingPrompts: false,
  isGeneratingLocation: false,
  places: [],
  aiProvider: 'free',
  historicalFacts: [],
  isLoadingFacts: false,
  weatherData: [],
  isLoadingWeather: false
};

const STORAGE_ERROR = 'Unable to save locally. Your browser storage may be full; delete old projects or remove some generated images before saving again.';

interface StoredDraft {
  currentProjectId?: string;
  snapshot: AppState;
}

export function parseNumberOrFallback(value: unknown, fallback: number, min?: number, max?: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (typeof min === 'number' && rounded < min) return min;
  if (typeof max === 'number' && rounded > max) return max;
  return rounded;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeScene(scene: unknown, index: number): Scene | null {
  if (!scene || typeof scene !== 'object') return null;
  const raw = scene as Partial<Scene>;
  const prompt = asString(raw.prompt);
  const year = parseNumberOrFallback(raw.year, DEFAULT_APP_STATE.startYear, 0, 9999);

  return {
    id: asString(raw.id, `scene-${index}-${Date.now()}`),
    year,
    prompt,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    analysis: typeof raw.analysis === 'string' ? raw.analysis : undefined
  };
}

export function createSerializableSnapshot(state: Partial<AppState> | unknown): AppState {
  const raw = state && typeof state === 'object' ? state as Partial<AppState> : {};
  const scenes = Array.isArray(raw.scenes)
    ? raw.scenes.map(sanitizeScene).filter((scene): scene is Scene => Boolean(scene))
    : [];

  const aiProvider = raw.aiProvider === 'gemini' ? 'gemini' : 'free';

  return {
    ...DEFAULT_APP_STATE,
    startYear: parseNumberOrFallback(raw.startYear, DEFAULT_APP_STATE.startYear, 0, 9999),
    endYear: parseNumberOrFallback(raw.endYear, DEFAULT_APP_STATE.endYear, 0, 9999),
    numImages: parseNumberOrFallback(raw.numImages, DEFAULT_APP_STATE.numImages, 2, 20),
    locationHint: asString(raw.locationHint),
    locationDescription: asString(raw.locationDescription),
    charactersEnabled: asBoolean(raw.charactersEnabled),
    numPeople: parseNumberOrFallback(raw.numPeople, DEFAULT_APP_STATE.numPeople, 1, 10),
    characterNotes: asString(raw.characterNotes),
    decayLevel: parseNumberOrFallback(raw.decayLevel, DEFAULT_APP_STATE.decayLevel, 0, 100),
    aspectRatio: asString(raw.aspectRatio, DEFAULT_APP_STATE.aspectRatio),
    imageSize: asString(raw.imageSize, DEFAULT_APP_STATE.imageSize),
    scenes,
    isGeneratingPrompts: false,
    isGeneratingLocation: false,
    places: Array.isArray(raw.places) ? raw.places : [],
    aiProvider,
    selectedLocation: raw.selectedLocation && typeof raw.selectedLocation === 'object' ? raw.selectedLocation : undefined,
    historicalFacts: Array.isArray(raw.historicalFacts) ? raw.historicalFacts : [],
    isLoadingFacts: false,
    weatherData: Array.isArray(raw.weatherData) ? raw.weatherData : [],
    isLoadingWeather: false
  };
}

export function createBlankState(): AppState {
  return createSerializableSnapshot(DEFAULT_APP_STATE);
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function writeLocalStorage(key: string, value: unknown) {
  if (!storageAvailable()) return { ok: true };
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: STORAGE_ERROR };
  }
}

export function loadCurrentDraft(): StoredDraft | null {
  if (!storageAvailable()) return null;
  const parsed = parseJson<unknown>(window.localStorage.getItem(CURRENT_DRAFT_STORAGE_KEY), null);
  if (!parsed) return null;
  if (typeof parsed === 'object' && 'snapshot' in parsed) {
    const raw = parsed as Partial<StoredDraft>;
    return {
      currentProjectId: typeof raw.currentProjectId === 'string' ? raw.currentProjectId : undefined,
      snapshot: createSerializableSnapshot(raw.snapshot)
    };
  }
  return { snapshot: createSerializableSnapshot(parsed) };
}

export function saveCurrentDraft(state: AppState, currentProjectId?: string) {
  return writeLocalStorage(CURRENT_DRAFT_STORAGE_KEY, {
    currentProjectId,
    snapshot: createSerializableSnapshot(state)
  });
}

function sanitizeProject(project: unknown): SavedProject | null {
  if (!project || typeof project !== 'object') return null;
  const raw = project as Partial<SavedProject>;
  const snapshot = createSerializableSnapshot(raw.snapshot);
  const id = asString(raw.id, makeId('project'));
  const name = asString(raw.name).trim() || suggestProjectName(snapshot);
  const createdAt = asString(raw.createdAt, new Date().toISOString());
  const updatedAt = asString(raw.updatedAt, createdAt);

  return { id, name, createdAt, updatedAt, snapshot };
}

export function loadSavedProjects(): SavedProject[] {
  if (!storageAvailable()) return [];
  const parsed = parseJson<unknown>(window.localStorage.getItem(PROJECTS_STORAGE_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(sanitizeProject)
    .filter((project): project is SavedProject => Boolean(project))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function saveSavedProjects(projects: SavedProject[]) {
  const sanitized = projects
    .map(sanitizeProject)
    .filter((project): project is SavedProject => Boolean(project))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return writeLocalStorage(PROJECTS_STORAGE_KEY, sanitized);
}

export function buildSavedProject(state: AppState, name: string, existing?: SavedProject): SavedProject {
  const now = new Date().toISOString();
  return {
    id: existing?.id || makeId('project'),
    name: name.trim() || suggestProjectName(state),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    snapshot: createSerializableSnapshot(state)
  };
}

export function suggestProjectName(state: Pick<AppState, 'locationHint' | 'locationDescription' | 'startYear' | 'endYear'>) {
  const source = state.locationHint.trim() || state.locationDescription.trim();
  const base = source ? source.split(/[\n.]/)[0].trim() : 'Untitled timeline';
  const compact = base.length > 42 ? `${base.slice(0, 39).trim()}...` : base;
  return `${compact} · ${state.startYear}–${state.endYear}`;
}

export function hasMeaningfulProjectData(state: AppState) {
  return Boolean(
    state.locationHint.trim() ||
    state.locationDescription.trim() ||
    state.scenes.length > 0 ||
    state.places?.length
  );
}
