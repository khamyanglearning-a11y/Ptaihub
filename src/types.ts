export interface Word {
  id: string;
  english: string;
  tai: string;
  assamese: string;
  pronunciation: string;
  dateAdded: string;
  status: 'active' | 'deleted';
}

export interface Sentence {
  id: string;
  english: string;
  tai: string;
  pronunciation: string;
  dateAdded: string;
  status: 'active' | 'deleted';
}

export interface Analytics {
  totalWords: number;
  totalSentences: number;
  wordsToday: number;
  sentencesToday: number;
  totalDeleted: number;
}

export interface ActivityLog {
  date: string;
  wordsAdded: number;
  sentencesAdded: number;
}
