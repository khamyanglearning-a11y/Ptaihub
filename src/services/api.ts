import bcrypt from 'bcryptjs';
import { Word, Sentence } from '../types';

const API_BASE = '/api/dictionary';

// Admin credentials from env or defaults
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
// Default hash for 'admin123' if not provided in env
const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH || '$2a$10$8K9Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8';

const STORAGE_KEY_WORDS = 'tai_hub_offline_words';
const STORAGE_KEY_SENTENCES = 'tai_hub_offline_sentences';
const STORAGE_KEY_LAST_SYNC = 'tai_hub_last_sync';

export const apiService = {
  async login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    if (username !== ADMIN_USERNAME) {
      return { success: false, message: 'Invalid username' };
    }

    const isMatch = ADMIN_PASSWORD_HASH.startsWith('$2a$')
      ? bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)
      : password === ADMIN_PASSWORD_HASH;

    if (isMatch) {
      return { success: true };
    } else {
      return { success: false, message: 'Invalid password' };
    }
  },

  async changePassword(_old: string, _new: string): Promise<{ success: boolean; message?: string }> {
    return { success: true, message: 'Password changed successfully (simulated)' };
  },

  async syncOfflineData(): Promise<{ success: boolean; count: number }> {
    try {
      const { words, sentences } = await this.fetchData();
      localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
      localStorage.setItem(STORAGE_KEY_SENTENCES, JSON.stringify(sentences));
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      return { success: true, count: words.length + sentences.length };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, count: 0 };
    }
  },

  getOfflineData(): { words: Word[]; sentences: Sentence[]; lastSync: string | null } {
    const words = JSON.parse(localStorage.getItem(STORAGE_KEY_WORDS) || '[]');
    const sentences = JSON.parse(localStorage.getItem(STORAGE_KEY_SENTENCES) || '[]');
    const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    return { words, sentences, lastSync };
  },

  async fetchData(): Promise<{ words: Word[]; sentences: Sentence[] }> {
    try {
      const res = await fetch(`${API_BASE}?action=fetch`);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      const mappedWords = (data.words || []).map((w: any) => ({
        ...w,
        dateAdded: w.date_added
      }));

      const mappedSentences = (data.sentences || []).map((s: any) => ({
        ...s,
        dateAdded: s.date_added
      }));

      return { words: mappedWords, sentences: mappedSentences };
    } catch (error) {
      console.error('Fetch data error:', error);
      return { words: [], sentences: [] };
    }
  },

  fetchDataSync(): { words: Word[]; sentences: Sentence[] } {
    return { words: [], sentences: [] };
  },

  async addWord(word: Omit<Word, 'id' | 'dateAdded' | 'status'>): Promise<{ success: boolean; id?: string }> {
    try {
      const res = await fetch(`${API_BASE}?action=add&type=words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: word.english,
          tai: word.tai,
          assamese: word.assamese,
          pronunciation: word.pronunciation,
        }),
      });
      if (!res.ok) throw new Error(`Add word failed: ${res.status}`);
      const data = await res.json();
      return { success: data.success, id: data.id };
    } catch (error) {
      console.error('Add word error:', error);
      return { success: false };
    }
  },

  async addSentence(sentence: Omit<Sentence, 'id' | 'dateAdded' | 'status'>): Promise<{ success: boolean; id?: string }> {
    try {
      const res = await fetch(`${API_BASE}?action=add&type=sentences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: sentence.english,
          tai: sentence.tai,
          pronunciation: sentence.pronunciation,
        }),
      });
      if (!res.ok) throw new Error(`Add sentence failed: ${res.status}`);
      const data = await res.json();
      return { success: data.success, id: data.id };
    } catch (error) {
      console.error('Add sentence error:', error);
      return { success: false };
    }
  },

  async updateWord(id: string, updatedWord: Partial<Word>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=update&type=words&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWord),
      });
      if (!res.ok) throw new Error(`Update word failed: ${res.status}`);
      const data = await res.json();
      return { success: data.success };
    } catch (error) {
      console.error('Update word error:', error);
      return { success: false };
    }
  },

  async updateSentence(id: string, updatedSentence: Partial<Sentence>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=update&type=sentences&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSentence),
      });
      if (!res.ok) throw new Error(`Update sentence failed: ${res.status}`);
      const data = await res.json();
      return { success: data.success };
    } catch (error) {
      console.error('Update sentence error:', error);
      return { success: false };
    }
  },

  async deleteItem(type: 'word' | 'sentence', id: string): Promise<{ success: boolean }> {
    try {
      const table = type === 'word' ? 'words' : 'sentences';
      const res = await fetch(`${API_BASE}?action=delete&type=${table}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      const data = await res.json();
      return { success: data.success };
    } catch (error) {
      console.error('Delete item error:', error);
      return { success: false };
    }
  }
};
