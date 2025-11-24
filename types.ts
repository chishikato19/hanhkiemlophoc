export enum AcademicPerformance {
  POOR = 'Chưa đạt',
  PASS = 'Đạt',
  GOOD = 'Tốt',
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  academic: AcademicPerformance;
  isTalkative: boolean;
}

export interface WeeklyConduct {
  week: number;
  score: number; // 1-10
  violations: string;
}

export interface StudentRecord {
  studentId: string;
  conducts: WeeklyConduct[];
}

export interface AppSettings {
  goodThreshold: number;
  fairThreshold: number;
  passThreshold: number;
}

// Default Grid: 8 Columns x 6 Rows (48 Seats)
// Based on logic: "1,2,9,10 is a group". Difference is 8, so Width must be 8.
export const GRID_COLS = 8;
export const GRID_ROWS = 6;
