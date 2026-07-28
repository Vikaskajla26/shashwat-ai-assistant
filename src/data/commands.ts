export interface CommandItem {
  command: string;
  category: string;
  description: string;
  syntax: string;
  example: string;
}

export const DEFAULT_COMMANDS: CommandItem[] = [
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
  { command: '/chant', category: 'Sanskrit', description: 'Open Sanskrit Chant Intelligence Studio for pronunciation & mātrā practice', syntax: '/chant [shloka]', example: '/chant KarmaNyeVadhikaraste' },
  { command: '/matra', category: 'Sanskrit', description: 'Analyze Hrasva/Dīrgha Mātrā counts and metrical Chanda structure', syntax: '/matra [shloka text]', example: '/matra Raganadirogan Satatanushaktan' },
  { command: '/sanskrit', category: 'Sanskrit', description: 'Detailed Sanskrit phonetic analysis, Sandhi breakdown, and transliteration', syntax: '/sanskrit [text]', example: '/sanskrit Mahamrityunjaya Mantra' },
  { command: '/druginfo', category: 'Ayurveda', description: 'Provide pharmacological & herbal drug monograph profile', syntax: '/druginfo [drug name]', example: '/druginfo Ashwagandha (Withania somnifera)' },

  { command: '/studyplan', category: 'Planning', description: 'Generate a personalized daily & weekly exam revision schedule', syntax: '/studyplan [days until exam]', example: '/studyplan 14 days until Pharmacology final' },
  { command: '/pomodoro', category: 'Planning', description: 'Configure 25/5 Pomodoro focus timer with break goals', syntax: '/pomodoro [sessions]', example: '/pomodoro 4 sessions' },
];
