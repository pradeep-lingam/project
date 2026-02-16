
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

export enum TranslationContext {
  Casual = 'casual',
  Formal = 'formal',
  Professional = 'professional',
  Emotional = 'emotional',
  Healthcare = 'healthcare',
}

export interface TranslationResult {
  text: string;
  detectedSourceLanguage?: string;
  confidenceScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}
