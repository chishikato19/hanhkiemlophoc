
import { Student, ConductRecord, Seat, Settings, AcademicRank, Gender, ROWS, COLS, AttendanceRecord, PendingReport, AttendanceStatus, BehaviorItem } from '../types';
import { addLog } from '../utils/logger';

// Default Keys
const KEY_STUDENTS = 'class_students';
const KEY_CONDUCT = 'class_conduct';
const KEY_SEATING = 'class_seating';
const KEY_SETTINGS = 'class_settings';
const KEY_GAS_URL = 'class_gas_url';
const KEY_ATTENDANCE = 'class_attendance';
const KEY_PENDING = 'class_pending_reports';

// Default Settings
const defaultSettings: Settings = {
  teacherPassword: '123456',
  studentCode: '1111',
  semesterStartDate: new Date().toISOString().split('T')[0],
  semesterTwoStartWeek: 19,
  thresholds: { good: 80, fair: 65, pass: 50 },
  defaultScore: 100,
  rankScores: {
    good: 10,
    fair: 8,
    pass: 6,
    fail: 4
  },
  semesterThresholds: {
    good: 9,
    fair: 7,
    pass: 5
  },
  behaviorConfig: {
    violations: [
      { id: 'v1', label: 'Nói chuyện riêng', points: -2 },
      { id: 'v2', label: 'Không làm bài tập', points: -5 },
      { id: 'v3', label: 'Đi muộn', points: -2 }, // Standard name matches AttendanceStatus
      { id: 'v4', label: 'Không soạn bài', points: -5 },
      { id: 'v5', label: 'Mất trật tự', points: -2 },
      { id: 'v6', label: 'Đồng phục sai quy định', points: -2 },
      { id: 'v7', label: 'Đánh nhau', points: -20 },
      { id: 'v8', label: 'Vô lễ với giáo viên', points: -20 },
      { id: 'v9', label: 'Vắng không phép', points: -5 } // Added for integration
    ],
    positives: [
      { id: 'p1', label: 'Phát biểu xây dựng bài', points: 1 },
      { id: 'p2', label: 'Làm bài tốt', points: 2 },
      { id: 'p3', label: 'Tiến bộ so với tuần trước', points: 5 },
      { id: 'p4', label: 'Tham gia trực nhật tốt', points: 2 },
      { id: 'p5', label: 'Giúp đỡ bạn bè', points: 2 }
    ]
  },
  gamification: {
    enabled: true,
    coinRules: {
      weeklyGood: 50,
      behaviorBonus: 10,
      improvement: 20,
      cleanSheet: 30
    },
    badges: [
      { id: 'streak_4', label: 'Chiến binh Bền bỉ', icon: '🔥', type: 'streak_good', threshold: 4, description: '4 tuần liên tiếp đạt Hạnh kiểm Tốt' },
      { id: 'speak_10', label: 'Nhà Hùng biện', icon: '🗣️', type: 'count_behavior', threshold: 10, targetBehaviorLabel: 'Phát biểu xây dựng bài', description: 'Đạt 10 lần phát biểu xây dựng bài' },
      { id: 'clean_8', label: 'Thiên thần Áo trắng', icon: '😇', type: 'no_violation_streak', threshold: 8, description: '8 tuần liên tiếp không vi phạm' },
      { id: 'help_5', label: 'Đại sứ Thân thiện', icon: '🤝', type: 'count_behavior', threshold: 5, targetBehaviorLabel: 'Giúp đỡ bạn bè', description: '5 lần giúp đỡ bạn bè' }
    ],
    rewards: [
      { id: 'r1', label: 'Kẹo mút', cost: 50, description: 'Một chiếc kẹo ngọt ngào', stock: -1 },
      { id: 'r2', label: 'Bút bi thiên long', cost: 100, description: 'Bút bi viết siêu mượt', stock: 20 },
      { id: 'r3', label: 'Thẻ miễn bài tập', cost: 500, description: 'Miễn làm bài tập về nhà 1 lần', stock: -1 },
      { id: 'r4', label: 'Vé chọn chỗ VIP', cost: 300, description: 'Được tự chọn chỗ ngồi trong 1 ngày', stock: -1 },
      { id: 'r5', label: 'DJ của lớp', cost: 150, description: 'Được chọn nhạc giờ ra chơi', stock: -1 }
    ]
  },
  lockedWeeks: []
};

// --- Mock/Seed Data ---
export const seedData = () => {
  const students: Student[] = Array.from({ length: 40 }).map((_, i) => ({
    id: `STU-${i + 1}`,
    name: `Học sinh ${i + 1}`,
    gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
    rank: i < 10 ? AcademicRank.GOOD : i < 25 ? AcademicRank.FAIR : i < 35 ? AcademicRank.PASS : AcademicRank.FAIL,
    isTalkative: i % 5 === 0,
    isActive: true,
    balance: Math.floor(Math.random() * 200), // Random starting coins
    badges: i < 5 ? ['streak_4'] : [] // Top 5 students have a badge
  }));

  const conduct: ConductRecord[] = [];
  students.forEach(s => {
    // Generate 4 weeks of data
    for (let w = 1; w <= 4; w++) {
      const isGoodWeek = Math.random() > 0.3;
      const score = isGoodWeek ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 40; 
      
      const violations = score < 80 ? ['Nói chuyện riêng', 'Không làm bài tập'] : [];
      const positive = score >= 90 ? ['Phát biểu xây dựng bài'] : [];

      conduct.push({
        id: `CON-${s.id}-W${w}`,
        studentId: s.id,
        week: w,
        score: score,
        violations: violations,
        positiveBehaviors: positive
      });
    }
  });

  // Seed Attendance
  const attendance: AttendanceRecord[] = [];
  const pending: PendingReport[] = [];
  
  // Create some pending reports for demo
  pending.push({
      id: 'REP-1',
      timestamp: new Date().toISOString(),
      targetDate: new Date().toISOString().split('T')[0],
      week: 4,
      reporterName: 'Lớp Trưởng',
      targetStudentName: students[2].name,
      type: 'VIOLATION',
      content: 'Nói chuyện riêng',
      note: 'Trong giờ Toán'
  });
  pending.push({
      id: 'REP-2',
      timestamp: new Date().toISOString(),
      targetDate: new Date().toISOString().split('T')[0],
      week: 4,
      reporterName: 'Lớp Phó',
      targetStudentName: students[5].name,
      type: 'ATTENDANCE',
      content: AttendanceStatus.LATE,
      note: 'Đến sau trống 5p'
  });

  localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  localStorage.setItem(KEY_CONDUCT, JSON.stringify(conduct));
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(defaultSettings));
  localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(attendance));
  localStorage.setItem(KEY_PENDING, JSON.stringify(pending));
  
  addLog('SYSTEM', 'Đã khởi tạo dữ liệu mẫu thành công.');
  window.location.reload();
};

// --- Students ---
export const getStudents = (): Student[] => {
  const raw = JSON.parse(localStorage.getItem(KEY_STUDENTS) || '[]');
  return raw.map((s: any) => ({ 
    ...s, 
    isActive: s.isActive !== undefined ? s.isActive : true,
    balance: s.balance !== undefined ? s.balance : 0,
    badges: s.badges || []
  }));
};

export const saveStudents = (students: Student[]) => {
  localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  addLog('DATA', `Đã lưu danh sách ${students.length} học sinh.`);
};

// --- Conduct ---
export const getConductRecords = (): ConductRecord[] => {
  return JSON.parse(localStorage.getItem(KEY_CONDUCT) || '[]');
};

export const saveConductRecords = (records: ConductRecord[]) => {
  localStorage.setItem(KEY_CONDUCT, JSON.stringify(records));
  addLog('DATA', `Đã cập nhật dữ liệu hạnh kiểm.`);
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => {
    return JSON.parse(localStorage.getItem(KEY_ATTENDANCE) || '[]');
};

export const saveAttendance = (records: AttendanceRecord[]) => {
    localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(records));
    addLog('DATA', 'Đã cập nhật dữ liệu điểm danh.');
};

// --- Pending Reports (Inbox) ---
export const getPendingReports = (): PendingReport[] => {
    return JSON.parse(localStorage.getItem(KEY_PENDING) || '[]');
};

export const savePendingReports = (reports: PendingReport[]) => {
    localStorage.setItem(KEY_PENDING, JSON.stringify(reports));
};

// --- Settings ---
export const getSettings = (): Settings => {
  const stored = localStorage.getItem(KEY_SETTINGS);
  if (stored) {
    const parsed = JSON.parse(stored);
    return { 
        ...defaultSettings, 
        ...parsed,
        teacherPassword: parsed.teacherPassword || defaultSettings.teacherPassword,
        studentCode: parsed.studentCode || defaultSettings.studentCode,
        rankScores: { ...defaultSettings.rankScores, ...(parsed.rankScores || {}) },
        semesterThresholds: { ...defaultSettings.semesterThresholds, ...(parsed.semesterThresholds || {}) },
        behaviorConfig: {
            violations: parsed.behaviorConfig?.violations || defaultSettings.behaviorConfig.violations,
            positives: parsed.behaviorConfig?.positives || defaultSettings.behaviorConfig.positives
        },
        gamification: {
          enabled: parsed.gamification?.enabled ?? defaultSettings.gamification.enabled,
          badges: parsed.gamification?.badges || defaultSettings.gamification.badges,
          rewards: parsed.gamification?.rewards || defaultSettings.gamification.rewards,
          coinRules: { ...defaultSettings.gamification.coinRules, ...(parsed.gamification?.coinRules || {}) }
        },
        lockedWeeks: parsed.lockedWeeks || [],
        semesterTwoStartWeek: parsed.semesterTwoStartWeek || defaultSettings.semesterTwoStartWeek
    };
  }
  return defaultSettings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  addLog('CONFIG', 'Đã cập nhật cấu hình hệ thống.');
};

// --- Seating ---
export const getSeatingMap = (): Seat[] => {
  const stored = localStorage.getItem(KEY_SEATING);
  if (stored) return JSON.parse(stored);
  const seats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      seats.push({ row: r, col: c, studentId: null });
    }
  }
  return seats;
};

export const saveSeatingMap = (seats: Seat[]) => {
  localStorage.setItem(KEY_SEATING, JSON.stringify(seats));
  addLog('SEATING', 'Đã lưu sơ đồ chỗ ngồi mới.');
};

// --- Google Apps Script URL ---
export const getGasUrl = (): string => {
  return localStorage.getItem(KEY_GAS_URL) || '';
};

export const saveGasUrl = (url: string) => {
  localStorage.setItem(KEY_GAS_URL, url);
  addLog('CONFIG', 'Đã lưu URL kết nối Google Sheet.');
};

// --- JSON Import/Export ---
export const exportFullData = () => {
  const data = {
    students: getStudents(),
    conduct: getConductRecords(),
    attendance: getAttendance(),
    seating: getSeatingMap(),
    settings: getSettings(),
    gasUrl: getGasUrl(),
    exportDate: new Date().toISOString(),
    version: '2.0'
  };
  return JSON.stringify(data, null, 2);
};

export const importFullData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !data.settings) {
      throw new Error("File không đúng định dạng.");
    }
    localStorage.setItem(KEY_STUDENTS, JSON.stringify(data.students));
    if (data.conduct) localStorage.setItem(KEY_CONDUCT, JSON.stringify(data.conduct));
    if (data.attendance) localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(data.attendance));
    if (data.seating) localStorage.setItem(KEY_SEATING, JSON.stringify(data.seating));
    if (data.settings) localStorage.setItem(KEY_SETTINGS, JSON.stringify(data.settings));
    if (data.gasUrl) localStorage.setItem(KEY_GAS_URL, data.gasUrl);
    addLog('SYSTEM', 'Đã khôi phục dữ liệu từ file backup thành công.');
    return true;
  } catch (e) {
    console.error(e);
    alert("Lỗi khi đọc file backup. Vui lòng kiểm tra lại file.");
    return false;
  }
};

// --- Cloud Sync (Teacher) ---
export const uploadToCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) {
        alert("Vui lòng cấu hình URL Google Apps Script.");
        return false;
    }
    const payload = {
        action: 'save',
        data: {
            students: getStudents(),
            conduct: getConductRecords(),
            attendance: getAttendance(),
            seating: getSeatingMap(),
            settings: getSettings(),
            timestamp: new Date().toISOString()
        }
    };
    try {
        addLog('CLOUD', 'Đang gửi dữ liệu lên Google Sheets...');
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            addLog('CLOUD', 'Đồng bộ lên đám mây thành công!');
            return true;
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        addLog('CLOUD_ERROR', `Lỗi khi upload: ${e.message}`);
        return false;
    }
};

export const downloadFromCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) { alert("Vui lòng cấu hình URL Google Apps Script."); return false; }
    try {
        addLog('CLOUD', 'Đang tải dữ liệu từ Google Sheets...');
        const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'load' }) });
        const result = await response.json();
        if (result.status === 'success' && result.data) {
            const { students, conduct, attendance, seating, settings } = result.data;
            if (students) localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
            if (conduct) localStorage.setItem(KEY_CONDUCT, JSON.stringify(conduct));
            if (attendance) localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(attendance));
            if (seating) localStorage.setItem(KEY_SEATING, JSON.stringify(seating));
            if (settings) localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
            addLog('CLOUD', 'Đã tải và cập nhật dữ liệu từ đám mây.');
            return true;
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        addLog('CLOUD_ERROR', `Lỗi khi tải về: ${e.message}`);
        return false;
    }
};

// --- Student API (Remote) ---
export const fetchStudentNamesOnly = async (): Promise<{id: string, name: string}[]> => {
    const url = getGasUrl();
    // Fallback to local if no URL (Testing mode)
    if (!url) return getStudents().map(s => ({ id: s.id, name: s.name }));

    try {
        const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'get_names' }) });
        const result = await response.json();
        if (result.status === 'success') return result.data;
        return [];
    } catch (e) {
        console.error("Cloud fetch error, using local fallback", e);
        return getStudents().map(s => ({ id: s.id, name: s.name }));
    }
};

export const fetchBehaviorList = async (): Promise<BehaviorItem[]> => {
    const url = getGasUrl();
    if (!url) return getSettings().behaviorConfig.violations;

    try {
        const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'get_behaviors' }) });
        const result = await response.json();
        if (result.status === 'success') return result.data;
        return getSettings().behaviorConfig.violations;
    } catch (e) {
        return getSettings().behaviorConfig.violations;
    }
}

export const sendStudentReport = async (report: PendingReport): Promise<boolean> => {
    const url = getGasUrl();
    // Fallback to local
    if (!url) {
        const current = getPendingReports();
        savePendingReports([...current, report]);
        return true;
    }

    try {
        await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'student_submit', data: report }) });
        return true;
    } catch (e) {
        console.error("Cloud send error", e);
        return false;
    }
};

export const fetchPendingReportsCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) return true; // Just use local
    try {
         const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'get_pending' }) });
         const result = await response.json();
         if (result.status === 'success' && result.data) {
             const current = getPendingReports();
             const newReports = result.data.filter((r: PendingReport) => !current.find(c => c.id === r.id));
             savePendingReports([...current, ...newReports]);
             return true;
         }
         return false;
    } catch(e) { return false; }
};
