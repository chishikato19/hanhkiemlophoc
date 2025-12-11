
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

export interface InventoryItem {
  itemId: string;
  count: number;
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  rank: AcademicRank;
  isTalkative: boolean;
  isActive?: boolean;
  balance?: number; // Coin balance
  badges?: string[]; // Array of Badge IDs unlocked
  inventory?: InventoryItem[]; // Items purchased
  avatarUrl?: string; // Current avatar URL
  ownedAvatars?: string[]; // List of Avatar IDs owned
}

export interface ConductRecord {
  id: string;
  studentId: string;
  week: number;
  score: number; // 0-100
  violations: string[];
  positiveBehaviors?: string[];
  note?: string;
}

export enum AttendanceStatus {
  PRESENT = 'Có mặt',
  EXCUSED = 'Vắng có phép',
  UNEXCUSED = 'Vắng không phép',
  LATE = 'Đi muộn'
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
}

// Data submitted by students via Portal
export interface PendingReport {
  id: string;
  timestamp: string; // Submission time
  targetDate?: string; // The actual date of the incident
  week?: number; // The week of the incident
  reporterName?: string; // Who submitted this
  targetStudentName: string; // Who is being reported
  type: 'VIOLATION' | 'ATTENDANCE';
  content: string; // Violation name or Attendance status
  note?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'; // Tracking status
}

export interface BehaviorItem {
  id: string;
  label: string;
  points: number;
}

// Gamification Interfaces
export interface BadgeConfig {
  id: string;
  label: string;
  icon: string; // Emoji or URL
  type: 'streak_good' | 'count_behavior' | 'no_violation_streak' | 'improvement';
  threshold: number; // e.g., 4 weeks, 10 times
  targetBehaviorLabel?: string; // For 'count_behavior', which behavior to count
  description: string;
}

export interface RewardItem {
  id: string;
  label: string;
  cost: number;
  description?: string;
  stock?: number; // -1 for infinite
}

export interface AvatarItem {
  id: string;
  label: string;
  url: string; // Image URL
  cost: number;
}

export interface Settings {
  teacherPassword?: string;
  studentCode?: string;
  semesterStartDate: string;
  semesterTwoStartWeek: number;
  thresholds: {
    good: number;
    fair: number;
    pass: number;
  };
  defaultScore: number;
  rankScores: {
    good: number;
    fair: number;
    pass: number;
    fail: number;
  };
  semesterThresholds: {
    good: number;
    fair: number;
    pass: number;
  };
  behaviorConfig: {
    violations: BehaviorItem[];
    positives: BehaviorItem[];
  };
  // Gamification Settings
  gamification: {
    enabled: boolean;
    badges: BadgeConfig[];
    rewards: RewardItem[];
    avatars: AvatarItem[]; // New: Avatars list
    coinRules: {
      weeklyGood: number; // Coins for Good rank
      behaviorBonus: number; // Coins per positive behavior
      improvement: number; // Coins for improving score
      cleanSheet: number; // Coins for 0 violations
    }
  };
  lockedWeeks: number[];
  processedWeeks?: string[]; // Track which weeks have had coins distributed to avoid double counting
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
export const SEATS_PER_TABLE = 4;
