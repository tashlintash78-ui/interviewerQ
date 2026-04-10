import { InterviewSession } from '../types';

const STORAGE_KEY = 'interview_iq_sessions';

export const storageService = {
  saveSession(session: InterviewSession): void {
    const sessions = this.getSessions();
    sessions.unshift(session); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50))); // Keep last 50
  },

  getSessions(): InterviewSession[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse sessions', e);
      return [];
    }
  },

  deleteSession(id: string): void {
    const sessions = this.getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
