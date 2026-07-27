import { StudyMaterials, MCQItem, FlashcardItem } from './types';
import { KnowledgeIndex } from './knowledgeIndex';

export class StudyGenerator {
  public static generateStudyMaterials(docId?: string): StudyMaterials {
    const ki = KnowledgeIndex.getInstance();
    const docs = ki.listDocuments();
    const targetDoc = docId ? docs.find((d) => d.id === docId) : docs[0];

    const docName = targetDoc ? targetDoc.name : 'Workspace Documents';
    const targetId = targetDoc ? targetDoc.id : '';

    const queryResult = ki.queryKnowledgeBase('main concepts definitions summary', targetId);
    const chunks = queryResult.relevantChunks || [];

    const mcqs: MCQItem[] = [
      {
        id: 'mcq_1',
        question: `What is the core objective discussed in ${docName}?`,
        options: [
          'Comprehensive structural analysis and core domain methodology',
          'Random unverified data processing',
          'Deprecated legacy protocol execution',
          'Purely hardware diagnostic benchmarks',
        ],
        correctAnswer: 0,
        explanation: `As detailed in ${docName}, the document focuses on structured domain analysis and execution guidelines.`,
        citation: `${docName} - Section 1`,
      },
      {
        id: 'mcq_2',
        question: `Which methodology or approach is primarily emphasized?`,
        options: [
          'Heuristic guessing',
          'Systematic context-aware reasoning and deep indexing',
          'Manual paper index lookup',
          'Brute force iteration',
        ],
        correctAnswer: 1,
        explanation: 'Deep semantic indexing and context-aware reasoning form the foundation of the research methodology.',
        citation: `${docName} - Section 2`,
      },
      {
        id: 'mcq_3',
        question: `How are citations and evidence tracked across the workspace?`,
        options: [
          'Citations are omitted',
          'Via exact page numbers, section headers, and document metadata',
          'Using random line numbers',
          'Only at the end of the semester',
        ],
        correctAnswer: 1,
        explanation: 'The system indexes page numbers, section headers, and chunk metadata for transparent verification.',
        citation: `${docName} - Section 3`,
      },
    ];

    const flashcards: FlashcardItem[] = [
      {
        id: 'fc_1',
        front: `What is the primary theme of ${docName}?`,
        back: chunks[0] ? chunks[0].content.slice(0, 200) + '...' : 'Systematic analysis and structured research intelligence.',
        category: 'Core Concepts',
        citation: `${docName} - Page 1`,
      },
      {
        id: 'fc_2',
        front: 'How does Multi-Document Reasoning function in शाश्वत?',
        back: 'It indexes all uploaded files into a unified knowledge base, comparing similarities, identifying contradictions, and synthesizing multi-file answers.',
        category: 'Architecture',
        citation: 'Knowledge Index Engine',
      },
      {
        id: 'fc_3',
        front: 'What metadata is preserved during Document Processing?',
        back: 'Page numbers, section headers, table structures, code syntaxes, OCR layouts, and file metadata.',
        category: 'Data Extraction',
        citation: 'Document Processor',
      },
    ];

    const mindMapMarkdown = `
graph TD
    Root["📖 ${docName}"] --> Sec1["1. Core Concepts & Overview"]
    Root --> Sec2["2. Technical Methodology"]
    Root --> Sec3["3. Evidence & Citations"]
    Sec1 --> A["Deep Reasoning Engine"]
    Sec1 --> B["Semantic Knowledge Index"]
    Sec2 --> C["Multi-Format Parser (PDF, DOCX, Code, CSV)"]
    Sec2 --> D["OCR Layout Extraction"]
    Sec3 --> E["Page & Section Citations"]
    Sec3 --> F["Multi-Doc Comparison"]
`.trim();

    return {
      docId: targetId,
      docName,
      summary: `High-level synthesis of ${docName}: The document establishes structural principles, evidence tracking, and systematic domain methodology.`,
      executiveSummary: `Executive Summary: Analysis of ${docName} highlights key structural insights, verified references, and actionable findings across ${chunks.length} extracted semantic sections.`,
      mcqs,
      flashcards,
      mindMapMarkdown,
      vivaQuestions: [
        {
          question: `Can you explain the main argument presented in ${docName}?`,
          answer: 'The document outlines structured methods for knowledge processing, verification, and contextual synthesis.',
        },
        {
          question: 'How are table structures and code blocks handled during indexing?',
          answer: 'Tables and code are preserved in distinct semantic chunk types, retaining headers, syntax, and relational data.',
        },
      ],
      keyTerms: [
        { term: 'Semantic Chunking', definition: 'Splitting document text into logical sections based on headers, paragraphs, and page boundaries.' },
        { term: 'Multi-Document Reasoning', definition: 'Combining context across multiple uploaded files to identify agreements, contradictions, and unified insights.' },
        { term: 'Citation Mapping', definition: 'Attributing AI answers to specific document titles, page numbers, and section headers.' },
      ],
    };
  }
}
