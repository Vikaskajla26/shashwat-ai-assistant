export interface DocumentMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  pageCount?: number;
  language?: string;
  summary?: string;
  category?: 'document' | 'code' | 'spreadsheet' | 'image' | 'presentation' | 'archive' | 'audio_video';
}

export interface DocumentSection {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  sectionHeader: string;
  content: string;
  chunkType: 'text' | 'table' | 'code' | 'ocr_image' | 'formula';
}

export interface SearchCitation {
  docId: string;
  docName: string;
  pageNumber: number;
  sectionHeader: string;
  snippet: string;
  score: number;
}

export interface KnowledgeQueryResult {
  query: string;
  answer: string;
  citations: SearchCitation[];
  relevantChunks: DocumentSection[];
  multiDocReasoning?: {
    filesSearched: number;
    agreements?: string[];
    contradictions?: string[];
  };
}

export interface MCQItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  citation: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category: string;
  citation: string;
}

export interface StudyMaterials {
  docId: string;
  docName: string;
  summary: string;
  executiveSummary: string;
  mcqs: MCQItem[];
  flashcards: FlashcardItem[];
  mindMapMarkdown: string;
  vivaQuestions: { question: string; answer: string }[];
  keyTerms: { term: string; definition: string }[];
}

export interface DocumentComparison {
  filesCompared: string[];
  similarities: string[];
  contradictions: string[];
  comparisonTable: { feature: string; [fileName: string]: string }[];
  synthesis: string;
}
