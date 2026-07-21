export type DocumentSectionId = string;
export type DocumentSectionAnchor = string;
export type ArticleRegionId =
  | "lesson-header"
  | "table-of-contents"
  | "technical-document"
  | "reference-content"
  | "glossary"
  | "learning-support"
  | "knowledge-check";

export type GlossaryTermId = string;
export type QuizQuestionId = string;

export type DocumentBlock =
  | {
      id: string;
      type: "paragraph";
      text: string;
    }
  | {
      id: string;
      type: "code";
      language: "typescript" | "http";
      label: string;
      code: string;
    }
  | {
      id: string;
      type: "table";
      caption: string;
      columns: [string, string, string];
      rows: Array<[string, string, string]>;
    }
  | {
      id: string;
      type: "callout";
      tone: "note" | "warning";
      title: string;
      text: string;
    }
  | {
      id: string;
      type: "timeline";
      title: string;
      description: string;
      steps: Array<{ label: string; delay: string; detail: string }>;
    };

export type DocumentSection = {
  id: DocumentSectionId;
  anchor: DocumentSectionAnchor;
  eyebrow: string;
  title: string;
  summary: string;
  readingMinutes: number;
  blocks: DocumentBlock[];
};

export type GlossaryTerm = {
  id: GlossaryTermId;
  term: string;
  definition: string;
};

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: QuizQuestionId;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

export type TechnicalLesson = {
  id: string;
  title: string;
  kicker: string;
  objective: string;
  estimatedMinutes: number;
  sections: DocumentSection[];
  glossary: GlossaryTerm[];
  quiz: QuizQuestion;
};

export type SectionActivity = {
  sectionId: DocumentSectionId;
  anchor: DocumentSectionAnchor;
};

export type SectionNavigation = SectionActivity & {
  source: "table-of-contents" | "progress-control";
};

export type GlossaryInteraction = {
  termId: GlossaryTermId;
  action: "open" | "close";
};

export type QuizAttempt = {
  questionId: QuizQuestionId;
  selectedOptionId: string;
  correct: boolean;
  attemptedAt: string;
};

export type ReaderTextInteraction = SectionActivity & {
  type: "selection" | "reread";
  selectedCharacterCount?: number;
};

export type ActiveSectionCallback = (activity: SectionActivity) => void;
export type SectionNavigationCallback = (navigation: SectionNavigation) => void;
export type GlossaryInteractionCallback = (
  interaction: GlossaryInteraction,
) => void;
export type QuizAttemptCallback = (attempt: QuizAttempt) => void;
export type ReaderTextInteractionCallback = (
  interaction: ReaderTextInteraction,
) => void;
