export interface Scene {
  id: string;
  year: number;
  prompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  analysis?: string;
  isAnalyzing?: boolean;
  isEditing?: boolean;
  narrativeNote?: string;
  generationStatus?: 'queued' | 'generating' | 'done' | 'error';
}

export interface MapLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  data: Partial<AppState>;
}

export interface SmartSuggestion {
  year: number;
  reason: string;
  promptSuggestion: string;
}

export type TransitionType = 'fade' | 'slide' | 'cut' | 'dissolve' | 'wipe' | 'zoom' | 'filmreel';

export interface ExportPreset {
  id: string;
  name: string;
  icon: string;
  aspectRatio: string;
  duration: number;
  transition: TransitionType;
  quality: string;
  description: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  startYear: number;
  endYear: number;
  numImages: number;
  locationHint: string;
  decayLevel: number;
  charactersEnabled: boolean;
  numPeople: number;
  characterNotes: string;
}

export interface AppState {
  id?: string;
  name?: string;
  startYear: number;
  endYear: number;
  numImages: number;
  locationHint: string;
  locationDescription: string;
  charactersEnabled: boolean;
  numPeople: number;
  characterNotes: string;
  decayLevel: number;
  aspectRatio: string;
  imageSize: string;
  scenes: Scene[];
  isGeneratingPrompts: boolean;
  isGeneratingLocation: boolean;
  globalError?: string;
  places?: any[];
  uploadedImageBase64?: string;
  isAnalyzingImage?: boolean;
  projects?: Project[];
  mapLocation?: MapLocation;
  isBatchGenerating?: boolean;
  sidebarOpen?: boolean;
}
