export enum IndianLanguage {
  Hindi = 'Hindi',
  Bengali = 'Bengali',
  Tamil = 'Tamil',
  Telugu = 'Telugu',
  Marathi = 'Marathi',
  Gujarati = 'Gujarati',
  Kannada = 'Kannada',
  Malayalam = 'Malayalam',
  Punjabi = 'Punjabi',
  Urdu = 'Urdu',
}

export interface TranslationResult {
  text: string;
  detectedSourceLanguage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}
