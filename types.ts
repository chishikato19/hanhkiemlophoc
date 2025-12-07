
export enum AcademicRank {
  GOOD = 'Tốt',
  FAIR = 'Khá',
  PASS = 'Đạt',
  FAIL = 'Chưa đạt'
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ'
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  rank: AcademicRank;
  isTalkative: boolean;
}

export interface ConductRecord {
  id: string;
  studentId: string;
  week: number;
  score: number; // 0-100
  violations: string[]; // List of violation descriptions
  positiveBehaviors?: string[]; // List of positive behaviors
  note?: string; // Teacher's custom note
}

export interface BehaviorItem {
  id: string;
  label: string;
  points: number; // Negative for violations, positive for good behaviors
}

export interface Settings {
  semesterStartDate: string; // ISO Date string YYYY-MM-DD
  semesterTwoStartWeek: number; // The week number where Semester 2 begins
  thresholds: {
    good: number;
    fair: number;
    pass: number;
  };
  defaultScore: number;
  // Configuration for Semester Calculation
  rankScores: { // Score value for each rank (e.g., Good = 10)
    good: number;
    fair: number;
    pass: number;
    fail: number;
  };
  semesterThresholds: { // Thresholds for average semester score
    good: number;
    fair: number;
    pass: number;
  };
  // Dynamic Behavior Configuration
  behaviorConfig: {
    violations: BehaviorItem[];
    positives: BehaviorItem[];
  };
  lockedWeeks: number[]; // List of locked week numbers
}

export interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
}

export const ROWS = 6;
export const COLS = 8;
export const SEATS_PER_TABLE = 4; // 1 Table = 1/2 Row width
