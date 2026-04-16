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
}

export interface AppState {
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
}
