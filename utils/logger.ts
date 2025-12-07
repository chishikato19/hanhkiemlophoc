import { LogEntry } from '../types';

const STORAGE_KEY = 'app_work_log';

export const addLog = (action: string, details: string): void => {
  const logs: LogEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const newLog: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    details
  };
  // Keep last 100 logs
  const updatedLogs = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
  console.log(`[${newLog.timestamp}] ${action}: ${details}`);
};

export const getLogs = (): LogEntry[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
};

export const clearLogs = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};