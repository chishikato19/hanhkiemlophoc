
import { Student, ConductRecord, Seat, Settings, AcademicRank, Gender, ROWS, COLS } from '../types';
import { addLog } from '../utils/logger';

// Default Keys
const KEY_STUDENTS = 'class_students';
const KEY_CONDUCT = 'class_conduct';
const KEY_SEATING = 'class_seating';
const KEY_SETTINGS = 'class_settings';
const KEY_GAS_URL = 'class_gas_url'; // New Key for Google Apps Script URL

// Default Settings
const defaultSettings: Settings = {
  semesterStartDate: new Date().toISOString().split('T')[0], // Today as default
  semesterTwoStartWeek: 19, // Default start of Semester 2
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
      { id: 'v3', label: 'Đi học muộn', points: -2 },
      { id: 'v4', label: 'Không soạn bài', points: -5 },
      { id: 'v5', label: 'Mất trật tự', points: -2 },
      { id: 'v6', label: 'Đồng phục sai quy định', points: -2 },
      { id: 'v7', label: 'Đánh nhau', points: -20 },
      { id: 'v8', label: 'Vô lễ với giáo viên', points: -20 }
    ],
    positives: [
      { id: 'p1', label: 'Phát biểu xây dựng bài', points: 1 },
      { id: 'p2', label: 'Làm bài tốt', points: 2 },
      { id: 'p3', label: 'Tiến bộ so với tuần trước', points: 5 },
      { id: 'p4', label: 'Tham gia trực nhật tốt', points: 2 },
      { id: 'p5', label: 'Giúp đỡ bạn bè', points: 2 }
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
    isTalkative: i % 5 === 0 // Every 5th student is talkative
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

  localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  localStorage.setItem(KEY_CONDUCT, JSON.stringify(conduct));
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(defaultSettings));
  addLog('SYSTEM', 'Đã khởi tạo dữ liệu mẫu thành công.');
  window.location.reload();
};

// --- Students ---
export const getStudents = (): Student[] => {
  return JSON.parse(localStorage.getItem(KEY_STUDENTS) || '[]');
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

// --- Settings ---
export const getSettings = (): Settings => {
  const stored = localStorage.getItem(KEY_SETTINGS);
  if (stored) {
    const parsed = JSON.parse(stored);
    
    // Deep merge logic
    return { 
        ...defaultSettings, 
        ...parsed,
        rankScores: { ...defaultSettings.rankScores, ...(parsed.rankScores || {}) },
        semesterThresholds: { ...defaultSettings.semesterThresholds, ...(parsed.semesterThresholds || {}) },
        behaviorConfig: {
            violations: parsed.behaviorConfig?.violations || defaultSettings.behaviorConfig.violations,
            positives: parsed.behaviorConfig?.positives || defaultSettings.behaviorConfig.positives
        },
        lockedWeeks: parsed.lockedWeeks || [],
        semesterTwoStartWeek: parsed.semesterTwoStartWeek || defaultSettings.semesterTwoStartWeek
    };
  }
  return defaultSettings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  addLog('CONFIG', 'Đã cập nhật cấu hình điểm số.');
};

// --- Seating ---
export const getSeatingMap = (): Seat[] => {
  const stored = localStorage.getItem(KEY_SEATING);
  if (stored) return JSON.parse(stored);
  
  // Initialize empty grid
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
    seating: getSeatingMap(),
    settings: getSettings(),
    gasUrl: getGasUrl(),
    exportDate: new Date().toISOString(),
    version: '1.8'
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

// --- Cloud Sync (Google Sheets) ---

export const uploadToCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) {
        alert("Vui lòng cấu hình URL Google Apps Script trong tab 'Nhật Ký & HDSD' > 'Dữ liệu'.");
        return false;
    }

    const payload = {
        action: 'save',
        data: {
            students: getStudents(),
            conduct: getConductRecords(),
            seating: getSeatingMap(),
            settings: getSettings(),
            timestamp: new Date().toISOString()
        }
    };

    try {
        addLog('CLOUD', 'Đang gửi dữ liệu lên Google Sheets...');
        
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            addLog('CLOUD', 'Đồng bộ lên đám mây thành công!');
            return true;
        } else {
            throw new Error(result.error || 'Unknown error from script');
        }
    } catch (e: any) {
        addLog('CLOUD_ERROR', `Lỗi khi upload: ${e.message}`);
        console.error(e);
        return false;
    }
};

export const downloadFromCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) {
        alert("Vui lòng cấu hình URL Google Apps Script trước.");
        return false;
    }

    try {
        addLog('CLOUD', 'Đang tải dữ liệu từ Google Sheets...');
        
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'load' })
        });

        const result = await response.json();

        if (result.status === 'success' && result.data) {
            const { students, conduct, seating, settings } = result.data;
            
            if (students) localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
            if (conduct) localStorage.setItem(KEY_CONDUCT, JSON.stringify(conduct));
            if (seating) localStorage.setItem(KEY_SEATING, JSON.stringify(seating));
            if (settings) localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
            
            addLog('CLOUD', 'Đã tải và cập nhật dữ liệu từ đám mây.');
            return true;
        } else {
            throw new Error(result.error || 'Invalid response format');
        }
    } catch (e: any) {
        addLog('CLOUD_ERROR', `Lỗi khi tải về: ${e.message}`);
        console.error(e);
        return false;
    }
};
