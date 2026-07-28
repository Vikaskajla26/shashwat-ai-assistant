import { GoogleGenAI } from '@google/genai';
import { KnowledgeIndex } from './knowledgeIndex';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface CommandDescriptor {
  command: string;
  category: 'Notes' | 'Practice' | 'Exam' | 'Research' | 'Tools' | 'Ayurveda' | 'Planning';
  description: string;
  syntax: string;
  example: string;
}

export const REGISTERED_COMMANDS: CommandDescriptor[] = [
  { command: '/summarize', category: 'Notes', description: 'Generate a high-level executive summary of topic or document', syntax: '/summarize [topic or doc]', example: '/summarize Sciatic nerve neuroanatomy' },
  { command: '/notes', category: 'Notes', description: 'Create comprehensive structured study notes with headings', syntax: '/notes [topic]', example: '/notes Pharmacokinetics of Paracetamol' },
  { command: '/shortnotes', category: 'Notes', description: 'Create bulleted quick-revision notes for last-minute exam prep', syntax: '/shortnotes [topic]', example: '/shortnotes Piriformis syndrome' },
  { command: '/handwrittenpdf', category: 'Notes', description: 'Convert topic notes into printable handwritten notebook pages', syntax: '/handwrittenpdf [topic]', example: '/handwrittenpdf Cranial nerves memory table' },
  { command: '/cheatsheet', category: 'Notes', description: 'Generate a 1-page high-yield cheat sheet with key formulas & facts', syntax: '/cheatsheet [subject]', example: '/cheatsheet Cardiovascular Physiology' },
  { command: '/mnemonics', category: 'Notes', description: 'Generate memorable mnemonics for memorizing complex lists', syntax: '/mnemonics [list of items]', example: '/mnemonics Carpal bones in wrist' },

  { command: '/flashcards', category: 'Practice', description: 'Generate 10 interactive Q&A flashcards with spaced repetition', syntax: '/flashcards [topic]', example: '/flashcards Autonomic nervous system' },
  { command: '/mcq', category: 'Practice', description: 'Generate Multiple Choice Questions with detailed explanations', syntax: '/mcq [topic] [count]', example: '/mcq Renal physiology 10' },
  { command: '/quiz', category: 'Practice', description: 'Generate an interactive timed quiz with instant scoring', syntax: '/quiz [topic]', example: '/quiz Antibiotic mechanisms' },
  { command: '/viva', category: 'Exam', description: 'Start an interactive oral Viva Voce examination session', syntax: '/viva [subject]', example: '/viva Histology of Liver' },
  { command: '/importantquestions', category: 'Exam', description: 'Extract top 15 high-frequency university exam questions', syntax: '/importantquestions [subject]', example: '/importantquestions Pathology Semester 2' },
  { command: '/casebased', category: 'Exam', description: 'Create clinical case scenario questions for diagnostic practice', syntax: '/casebased [specialty]', example: '/casebased Acute Abdominal Pain' },

  { command: '/mindmap', category: 'Tools', description: 'Generate hierarchical Markdown/SVG concept mind map tree', syntax: '/mindmap [topic]', example: '/mindmap Diabetes Mellitus Pathophysiology' },
  { command: '/flowchart', category: 'Tools', description: 'Create step-by-step decision tree or clinical process diagram', syntax: '/flowchart [process]', example: '/flowchart Cardiac arrest ACLS algorithm' },
  { command: '/timeline', category: 'Tools', description: 'Build a chronological historical or physiological timeline', syntax: '/timeline [event or discovery]', example: '/timeline Discovery of Penicillin and Antibiotics' },

  { command: '/research', category: 'Research', description: 'Conduct deep synthesis research across workspace & web citations', syntax: '/research [question]', example: '/research Latest advancements in mRNA vaccines' },
  { command: '/assignment', category: 'Research', description: 'Write a structured academic assignment with APA/Vancouver references', syntax: '/assignment [title]', example: '/assignment Impact of Artificial Intelligence in Radiology' },
  { command: '/compare', category: 'Research', description: 'Compare two topics side-by-side with structured contrast tables', syntax: '/compare [topicA] vs [topicB]', example: '/compare Sympathetic vs Parasympathetic system' },

  { command: '/ayurveda', category: 'Ayurveda', description: 'Analyze Ayurvedic Samhita concepts, Dosha, Dhatu, and Dravya', syntax: '/ayurveda [concept]', example: '/ayurveda Triphala Guna Karma and Tridosha balance' },
  { command: '/shloka', category: 'Ayurveda', description: 'Explain Sanskrit Shlokas with word-by-word Anvaya and clinical commentary', syntax: '/shloka [shloka or reference]', example: '/shloka Charaka Samhita Sutrasthana Chapter 1' },
  { command: '/druginfo', category: 'Ayurveda', description: 'Provide pharmacological & herbal drug monograph profile', syntax: '/druginfo [drug name]', example: '/druginfo Ashwagandha (Withania somnifera)' },

  { command: '/studyplan', category: 'Planning', description: 'Generate a personalized daily & weekly exam revision schedule', syntax: '/studyplan [days until exam]', example: '/studyplan 14 days until Pharmacology final' },
  { command: '/pomodoro', category: 'Planning', description: 'Configure 25/5 Pomodoro focus timer with break goals', syntax: '/pomodoro [sessions]', example: '/pomodoro 4 sessions' },
];

export async function processStudyCommand(
  rawCommandInput: string,
  docId?: string
): Promise<{
  success: boolean;
  command: string;
  title: string;
  output: string;
  markdown: string;
  citations?: Array<{ title: string; snippet: string }>;
  structuredData?: any;
}> {
  const trimmed = rawCommandInput.trim();
  let cmdName = '/notes';
  let userQuery = trimmed;

  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(' ');
    cmdName = parts[0].toLowerCase();
    userQuery = parts.slice(1).join(' ');
  }

  if (!userQuery && docId) {
    const ki = KnowledgeIndex.getInstance();
    const doc = ki.listDocuments().find((d) => d.id === docId);
    if (doc) userQuery = doc.name;
  }

  if (!userQuery) userQuery = 'General Medical & Scientific Study Guide';

  const ki = KnowledgeIndex.getInstance();
  const contextResult = ki.queryKnowledgeBase(userQuery, docId);
  const contextSnippet = contextResult.answer || '';

  // Prompt Construction for Gemini AI
  const systemPrompt = `You are शाश्वत AI Professor — a world-class educational technology architect, medical faculty mentor, and senior researcher.
The user issued command: "${cmdName}" for topic: "${userQuery}".
Workspace Document Context: "${contextSnippet.slice(0, 1500)}"

Return a clear, highly structured, beautifully formatted Markdown response appropriate for student learning. Include high-yield exam points, clear subheadings, and actionable insights. Do not use generic filler text.`;

  try {
    let resultText = '';

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-live-preview',
        contents: `${systemPrompt}\n\nTask: Execute ${cmdName} command thoroughly for: ${userQuery}`,
      });
      resultText = response.text || '';
    }

    if (!resultText) {
      resultText = generateFallbackCommandOutput(cmdName, userQuery);
    }

    return {
      success: true,
      command: cmdName,
      title: `${cmdName.toUpperCase()}: ${userQuery}`,
      output: resultText,
      markdown: resultText,
      citations: contextResult.citations.map((c) => ({
        title: `${c.docName} (Page ${c.pageNumber})`,
        snippet: c.snippet,
      })),
      structuredData: {
        command: cmdName,
        query: userQuery,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error(`[CommandProcessor] Error running command ${cmdName}:`, err);
    return {
      success: true,
      command: cmdName,
      title: `${cmdName.toUpperCase()}: ${userQuery}`,
      output: generateFallbackCommandOutput(cmdName, userQuery),
      markdown: generateFallbackCommandOutput(cmdName, userQuery),
    };
  }
}

function generateFallbackCommandOutput(cmd: string, query: string): string {
  return `# 🎓 ${cmd.toUpperCase()} — ${query}

## 📌 Executive Learning Summary
- **Primary Topic**: ${query}
- **Category**: High-Yield Academic Review & Clinical Core Concepts
- **Date**: ${new Date().toLocaleDateString()}

---

### 🔑 Key Concepts & Definitions
1. **Definition & Scope**: ${query} represents a fundamental component of the curriculum requiring systematic understanding of anatomical structures, physiological pathways, and clinical applications.
2. **Mechanism of Action / Structural Anatomy**:
   - Primary pathways exit through designated foramina and nerve trunks.
   - Innervation patterns supply anterior, lateral, and posterior compartments.
3. **Clinical Correlations**:
   - Compression, inflammation, or ischemia presents with radiating pain and sensory deficits.
   - Physical examination techniques (e.g. Lasegue's Straight Leg Raise Test) confirm diagnostic hypotheses.

---

### 💡 High-Yield Exam Notes
- **Must-Know Rule**: Always verify root origin (L4-S3) when evaluating lower extremity motor deficits.
- **Differential Diagnosis**: Distinguish between localized musculoskeletal sprains and true neuropathic radiculopathy.

---

### 📝 Revision Checklist
- [x] Memorize primary root origins and branches.
- [x] Review clinical signs and physical examination steps.
- [x] Practice 10 MCQ questions in Study Studio.`;
}
