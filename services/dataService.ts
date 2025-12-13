
import { Student, ConductRecord, Seat, Settings, AcademicRank, Gender, ROWS, COLS, AttendanceRecord, PendingReport, AttendanceStatus, BehaviorItem, RoleBudgetConfig, PendingOrder, FundTransaction } from '../types';
import { addLog } from '../utils/logger';

// Default Keys
const KEY_STUDENTS = 'class_students';
const KEY_CONDUCT = 'class_conduct';
const KEY_SEATING = 'class_seating';
const KEY_SETTINGS = 'class_settings';
const KEY_GAS_URL = 'class_gas_url';
const KEY_ATTENDANCE = 'class_attendance';
const KEY_PENDING = 'class_pending_reports';
const KEY_ORDERS = 'class_pending_orders';
const KEY_FUNDS = 'class_funds';

// --- SECURITY & OBFUSCATION ---
// Simple obfuscation to prevent casual F12 snooping. 
// For military-grade security, logic must move to a real backend, 
// but this stops 99% of students.
const SALT = "L0p_H0c_Th0ng_M1nh_2024";

const encryptData = (data: any): string => {
    try {
        const json = JSON.stringify(data);
        // Base64 Encode + URI Component to handle UTF-8 correctly
        return 'SEC:' + btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch (e) {
        console.error("Encrypt error", e);
        return "";
    }
};

const decryptData = (ciphertext: string | null): any => {
    if (!ciphertext) return null;
    
    // Migration: If data is plain JSON (old format), return it directly
    if (!ciphertext.startsWith('SEC:')) {
        try {
            return JSON.parse(ciphertext);
        } catch (e) {
            return null;
        }
    }

    // Decrypt
    try {
        const raw = ciphertext.substring(4); // Remove 'SEC:' prefix
        const json = decodeURIComponent(atob(raw).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(json);
    } catch (e) {
        console.error("Decrypt error", e);
        return null;
    }
};

// --- SVG Frames Data (Giữ nguyên) ---
const FRAME_GOLD = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="gold" stroke-width="5"/><circle cx="50" cy="50" r="45" fill="none" stroke="orange" stroke-width="2" stroke-dasharray="10 5"/></svg>`;
const FRAME_SILVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="silver" stroke-width="5"/><circle cx="50" cy="50" r="45" fill="none" stroke="gray" stroke-width="1" stroke-dasharray="2"/></svg>`;
const FRAME_WOOD = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="saddlebrown" stroke-width="6"/><circle cx="50" cy="50" r="42" fill="none" stroke="peru" stroke-width="2"/></svg>`;
const FRAME_FIRE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="fire" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="red"/><stop offset="100%" stop-color="yellow"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="none" stroke="url(%23fire)" stroke-width="6" stroke-dasharray="5 2"/></svg>`;
const FRAME_NATURE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="forestgreen" stroke-width="5"/><path d="M50 5 Q55 0 60 5" stroke="green" fill="none"/><path d="M20 80 Q15 85 20 90" stroke="green" fill="none"/></svg>`;
const FRAME_SPACE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="midnightblue" stroke-width="6"/><circle cx="80" cy="20" r="5" fill="yellow"/><circle cx="20" cy="80" r="3" fill="white"/></svg>`;
const FRAME_ROYAL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="purple" stroke-width="6"/><circle cx="50" cy="50" r="45" fill="none" stroke="gold" stroke-width="2" stroke-dasharray="20 10"/></svg>`;
const FRAME_TECH = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="cyan" stroke-width="4"/><path d="M50 5 L50 15 M95 50 L85 50 M50 95 L50 85 M5 50 L15 50" stroke="cyan" stroke-width="2"/></svg>`;
const FRAME_NEON = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="50" cy="50" r="45" fill="none" stroke="%23ff00ff" stroke-width="4" filter="url(%23glow)"/><circle cx="50" cy="50" r="40" fill="none" stroke="%2300ffff" stroke-width="2"/></svg>`;
const FRAME_FLOWER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="pink" stroke-width="5"/><circle cx="50" cy="5" r="5" fill="hotpink"/><circle cx="95" cy="50" r="5" fill="hotpink"/><circle cx="50" cy="95" r="5" fill="hotpink"/><circle cx="5" cy="50" r="5" fill="hotpink"/><circle cx="18" cy="18" r="5" fill="purple"/><circle cx="82" cy="18" r="5" fill="purple"/><circle cx="82" cy="82" r="5" fill="purple"/><circle cx="18" cy="82" r="5" fill="purple"/></svg>`;
const FRAME_ICE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="deepskyblue"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="none" stroke="url(%23ice)" stroke-width="6"/><path d="M50 0 L55 10 M95 45 L85 50" stroke="white" stroke-width="2"/></svg>`;
const FRAME_PIXEL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="0" width="80" height="10" fill="lime"/><rect x="10" y="90" width="80" height="10" fill="lime"/><rect x="0" y="10" width="10" height="80" fill="lime"/><rect x="90" y="10" width="10" height="80" fill="lime"/><rect x="10" y="10" width="10" height="10" fill="green"/><rect x="80" y="10" width="10" height="10" fill="green"/><rect x="10" y="80" width="10" height="10" fill="green"/><rect x="80" y="80" width="10" height="10" fill="green"/></svg>`;
const FRAME_DARK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="black" stroke-width="8"/><circle cx="50" cy="50" r="46" fill="none" stroke="red" stroke-width="2" stroke-dasharray="20 5"/></svg>`;
const FRAME_RAINBOW = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="red"/><stop offset="20%" stop-color="orange"/><stop offset="40%" stop-color="yellow"/><stop offset="60%" stop-color="green"/><stop offset="80%" stop-color="blue"/><stop offset="100%" stop-color="violet"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="none" stroke="url(%23rainbow)" stroke-width="6"/></svg>`;

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
      { id: 'v1', label: 'Nói chuyện riêng', points: -2, category: 'DISCIPLINE' },
      { id: 'v2', label: 'Không làm bài tập', points: -5, category: 'STUDY' },
      { id: 'v3', label: 'Đi muộn', points: -2, category: 'DISCIPLINE' },
      { id: 'v4', label: 'Không soạn bài', points: -5, category: 'STUDY' },
      { id: 'v5', label: 'Mất trật tự', points: -2, category: 'DISCIPLINE' },
      { id: 'v6', label: 'Đồng phục sai quy định', points: -2, category: 'DISCIPLINE' },
      { id: 'v7', label: 'Đánh nhau', points: -20, category: 'DISCIPLINE' },
      { id: 'v8', label: 'Vô lễ với giáo viên', points: -20, category: 'DISCIPLINE' },
      { id: 'v9', label: 'Vắng không phép', points: -5, category: 'DISCIPLINE' },
      { id: 'v10', label: 'Trực nhật bẩn', points: -3, category: 'LABOR' },
      { id: 'v11', label: 'Xả rác', points: -2, category: 'LABOR' }
    ],
    positives: [
      { id: 'p1', label: 'Phát biểu xây dựng bài', points: 1, category: 'STUDY' },
      { id: 'p2', label: 'Làm bài tốt', points: 2, category: 'STUDY' },
      { id: 'p3', label: 'Tiến bộ so với tuần trước', points: 5, category: 'STUDY' },
      { id: 'p4', label: 'Tham gia trực nhật tốt', points: 2, category: 'LABOR' },
      { id: 'p5', label: 'Giúp đỡ bạn bè', points: 2, category: 'OTHER' }
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
    roleBudgets: {
        monitorWeeklyBudget: 50,
        viceWeeklyBudget: 30,
        maxRewardPerStudent: 5
    },
    badges: [
      { id: 'fire_warrior', label: 'Chiến Binh Bất Bại', icon: '🔥', type: 'streak_good', threshold: 4, description: '4 tuần liên tiếp đạt Hạnh kiểm Tốt' },
      { id: 'angel_aura', label: 'Thiên Thần Áo Trắng', icon: '😇', type: 'no_violation_streak', threshold: 8, description: '8 tuần liên tiếp không vi phạm nội quy' },
      { id: 'rising_star', label: 'Mầm Non Triển Vọng', icon: '🌱', type: 'improvement', threshold: 1, description: 'Có sự tiến bộ vượt bậc so với tuần trước' },
      { id: 'silent_star', label: 'Sao Im Lặng', icon: '🤫', type: 'no_violation_streak', threshold: 2, description: 'Giữ trật tự rất tốt trong 2 tuần liền' },
    ],
    rewards: [
      { id: 'r1', label: 'Kẹo mút', cost: 50, description: 'Một chiếc kẹo ngọt ngào', stock: -1, type: 'PHYSICAL' },
      { id: 'r3', label: 'Thẻ miễn bài tập', cost: 500, description: 'Miễn làm bài tập về nhà 1 lần', stock: -1, type: 'PHYSICAL' },
      { id: 'r_immunity', label: 'Kim Bài Miễn Tử', cost: 800, description: 'Xóa 1 lỗi vi phạm nhẹ', stock: 5, type: 'IMMUNITY' },
      { id: 'r_seat', label: 'Vé Chọn Chỗ VIP', cost: 600, description: 'Được ưu tiên chọn chỗ ngồi tuần sau', stock: 10, type: 'SEAT_TICKET' }
    ],
    avatars: [
        { id: 'av1', label: 'Hổ Mạnh Mẽ', url: '🐯', cost: 100 },
        { id: 'av2', label: 'Mèo May Mắn', url: '😺', cost: 100 },
        { id: 'av3', label: 'Cún Đáng Yêu', url: '🐶', cost: 100 },
        { id: 'av4', label: 'Gấu Trúc', url: '🐼', cost: 150 },
        { id: 'av5', label: 'Kỳ Lân', url: '🦄', cost: 500 }
    ],
    frames: [
        { id: 'frame_wood', label: 'Khung Gỗ', image: FRAME_WOOD, cost: 50 },
        { id: 'frame_silver', label: 'Khung Bạc', image: FRAME_SILVER, cost: 200 },
        { id: 'frame_gold', label: 'Khung Vàng', image: FRAME_GOLD, cost: 500 },
        { id: 'frame_fire', label: 'Hỏa Thần', image: FRAME_FIRE, cost: 1000 }
    ]
  },
  studentRoles: [],
  lockedWeeks: [],
  processedWeeks: []
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
    password: '123', // Default Password
    roles: i === 0 ? ['MONITOR'] : i === 1 ? ['VICE_STUDY'] : i === 2 ? ['VICE_DISCIPLINE'] : i === 3 ? ['TREASURER'] : [],
    balance: Math.floor(Math.random() * 200) + 100, // Giving some coins for testing
    badges: [],
    inventory: [],
    avatarUrl: undefined,
    ownedAvatars: [],
    frameUrl: undefined,
    ownedFrames: [],
    hasPrioritySeating: false
  }));

  const conduct: ConductRecord[] = [];
  students.forEach(s => {
    // Generate 4 weeks of data
    for (let w = 1; w <= 4; w++) {
      const isGoodWeek = Math.random() > 0.3;
      const score = isGoodWeek ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 40; 
      
      const violations = score < 80 ? ['Nói chuyện riêng'] : [];
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

  const attendance: AttendanceRecord[] = [];
  const pending: PendingReport[] = [];
  const funds: FundTransaction[] = [
      { id: 'FT-1', date: new Date().toISOString(), type: 'IN', amount: 500000, category: 'Quỹ lớp', description: 'Thu quỹ đầu năm', relatedStudentIds: [] },
      { id: 'FT-2', date: new Date().toISOString(), type: 'OUT', amount: 100000, category: 'Photo', description: 'Photo tài liệu tuần 1' }
  ];
  
  // Use Obfuscated Save
  localStorage.setItem(KEY_STUDENTS, encryptData(students));
  localStorage.setItem(KEY_CONDUCT, encryptData(conduct));
  localStorage.setItem(KEY_SETTINGS, encryptData(defaultSettings));
  localStorage.setItem(KEY_ATTENDANCE, encryptData(attendance));
  localStorage.setItem(KEY_PENDING, encryptData(pending));
  localStorage.setItem(KEY_FUNDS, encryptData(funds));
  localStorage.removeItem(KEY_ORDERS);
  
  addLog('SYSTEM', 'Đã khởi tạo dữ liệu mẫu thành công.');
  window.location.reload();
};

// --- Students ---
export const getStudents = (): Student[] => {
  const raw = decryptData(localStorage.getItem(KEY_STUDENTS)) || [];
  return raw.map((s: any) => ({ 
    ...s, 
    isActive: s.isActive !== undefined ? s.isActive : true,
    balance: s.balance !== undefined ? s.balance : 0,
    roles: s.roles || [],
    password: s.password || '123',
    badges: s.badges || [],
    inventory: s.inventory || [],
    avatarUrl: s.avatarUrl || undefined,
    ownedAvatars: s.ownedAvatars || [],
    frameUrl: s.frameUrl || undefined,
    ownedFrames: s.ownedFrames || [],
    hasPrioritySeating: s.hasPrioritySeating || false
  }));
};

export const saveStudents = (students: Student[]) => {
  localStorage.setItem(KEY_STUDENTS, encryptData(students));
  addLog('DATA', `Đã lưu danh sách ${students.length} học sinh.`);
};

// --- Conduct ---
export const getConductRecords = (): ConductRecord[] => {
  return decryptData(localStorage.getItem(KEY_CONDUCT)) || [];
};

export const saveConductRecords = (records: ConductRecord[]) => {
  localStorage.setItem(KEY_CONDUCT, encryptData(records));
  addLog('DATA', `Đã cập nhật dữ liệu hạnh kiểm.`);
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => {
    return decryptData(localStorage.getItem(KEY_ATTENDANCE)) || [];
};

export const saveAttendance = (records: AttendanceRecord[]) => {
    localStorage.setItem(KEY_ATTENDANCE, encryptData(records));
    addLog('DATA', 'Đã cập nhật dữ liệu điểm danh.');
};

// --- Pending Reports (Inbox) ---
export const getPendingReports = (): PendingReport[] => {
    return decryptData(localStorage.getItem(KEY_PENDING)) || [];
};

export const savePendingReports = (reports: PendingReport[]) => {
    localStorage.setItem(KEY_PENDING, encryptData(reports));
};

// --- Pending Orders (Store) ---
export const getPendingOrders = (): PendingOrder[] => {
    return decryptData(localStorage.getItem(KEY_ORDERS)) || [];
}

export const savePendingOrders = (orders: PendingOrder[]) => {
    localStorage.setItem(KEY_ORDERS, encryptData(orders));
}

// --- Fund Transactions (NEW) ---
export const getFundTransactions = (): FundTransaction[] => {
    return decryptData(localStorage.getItem(KEY_FUNDS)) || [];
}

export const saveFundTransactions = (transactions: FundTransaction[]) => {
    localStorage.setItem(KEY_FUNDS, encryptData(transactions));
}

// --- Settings ---
export const getSettings = (): Settings => {
  const stored = localStorage.getItem(KEY_SETTINGS);
  
  if (stored) {
    const parsed = decryptData(stored); // Use Decrypt

    // Helper to merge lists (Defaults + Saved)
    const mergeLists = (defaults: any[], saved: any[]) => {
        const merged = [...defaults];
        const defaultIds = new Set(defaults.map(i => i.id));
        saved.forEach(item => {
            if (defaultIds.has(item.id)) {
                const idx = merged.findIndex(i => i.id === item.id);
                if (idx > -1) merged[idx] = item;
            } else {
                merged.push(item);
            }
        });
        return merged;
    };

    const mergedBadges = mergeLists(defaultSettings.gamification.badges, parsed.gamification?.badges || []);
    const mergedAvatars = mergeLists(defaultSettings.gamification.avatars, parsed.gamification?.avatars || []);
    const mergedRewards = mergeLists(defaultSettings.gamification.rewards, parsed.gamification?.rewards || []);
    const mergedFrames = mergeLists(defaultSettings.gamification.frames, parsed.gamification?.frames || []);

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
          badges: mergedBadges,
          rewards: mergedRewards,
          avatars: mergedAvatars,
          frames: mergedFrames,
          coinRules: { ...defaultSettings.gamification.coinRules, ...(parsed.gamification?.coinRules || {}) },
          roleBudgets: { ...defaultSettings.gamification.roleBudgets, ...(parsed.gamification?.roleBudgets || {}) }
        },
        studentRoles: parsed.studentRoles || [],
        lockedWeeks: parsed.lockedWeeks || [],
        semesterTwoStartWeek: parsed.semesterTwoStartWeek || defaultSettings.semesterTwoStartWeek,
        processedWeeks: parsed.processedWeeks || []
    };
  }
  return defaultSettings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(KEY_SETTINGS, encryptData(settings));
  addLog('CONFIG', 'Đã cập nhật cấu hình hệ thống.');
};

// --- Seating ---
export const getSeatingMap = (): Seat[] => {
  const stored = localStorage.getItem(KEY_SEATING);
  if (stored) return decryptData(stored); // Use Decrypt
  const seats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      seats.push({ row: r, col: c, studentId: null });
    }
  }
  return seats;
};

export const saveSeatingMap = (seats: Seat[]) => {
  localStorage.setItem(KEY_SEATING, encryptData(seats));
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
    funds: getFundTransactions(),
    gasUrl: getGasUrl(),
    exportDate: new Date().toISOString(),
    version: '4.0'
  };
  return JSON.stringify(data, null, 2);
};

export const importFullData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !data.settings) {
      throw new Error("File không đúng định dạng.");
    }
    // Save Obfuscated
    localStorage.setItem(KEY_STUDENTS, encryptData(data.students));
    if (data.conduct) localStorage.setItem(KEY_CONDUCT, encryptData(data.conduct));
    if (data.attendance) localStorage.setItem(KEY_ATTENDANCE, encryptData(data.attendance));
    if (data.seating) localStorage.setItem(KEY_SEATING, encryptData(data.seating));
    if (data.settings) localStorage.setItem(KEY_SETTINGS, encryptData(data.settings));
    if (data.funds) localStorage.setItem(KEY_FUNDS, encryptData(data.funds));
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
            funds: getFundTransactions(),
            timestamp: new Date().toISOString()
        }
    };
    try {
        addLog('CLOUD', 'Đang gửi dữ liệu lên Google Sheets...');
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        try {
            const result = await response.json();
            if (result.status === 'success') {
                addLog('CLOUD', 'Đồng bộ lên đám mây thành công!');
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            throw new Error("Phản hồi từ Google không hợp lệ. Kiểm tra Deployment ID.");
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
        
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
             console.error("Cloud response is not JSON:", text.substring(0, 100));
             throw new Error("Dữ liệu trả về không phải JSON.");
        }

        if (result.status === 'success' && result.data) {
            const { students, conduct, attendance, seating, settings, funds } = result.data;
            if (students) localStorage.setItem(KEY_STUDENTS, encryptData(students));
            if (conduct) localStorage.setItem(KEY_CONDUCT, encryptData(conduct));
            if (attendance) localStorage.setItem(KEY_ATTENDANCE, encryptData(attendance));
            if (seating) localStorage.setItem(KEY_SEATING, encryptData(seating));
            if (settings) localStorage.setItem(KEY_SETTINGS, encryptData(settings));
            if (funds) localStorage.setItem(KEY_FUNDS, encryptData(funds));
            addLog('CLOUD', 'Đã tải và cập nhật dữ liệu từ đám mây.');
            return true;
        } else {
            throw new Error(result.error || "Lỗi không xác định từ Cloud.");
        }
    } catch (e: any) {
        addLog('CLOUD_ERROR', `Lỗi khi tải về: ${e.message}`);
        alert(`Lỗi khi tải dữ liệu: ${e.message}`);
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

// Fetch Settings Remote
export const fetchSettings = async (): Promise<Settings> => {
    const url = getGasUrl();
    if (!url) return getSettings();

    try {
        const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'get_settings' }) });
        const result = await response.json();
        if (result.status === 'success' && result.data) return result.data;
        return getSettings();
    } catch (e) {
        return getSettings();
    }
}

// NEW: Fetch Roles from Cloud
export const fetchRolesFromCloud = async (): Promise<any[]> => {
    return [];
}

export const sendStudentReport = async (report: PendingReport): Promise<boolean> => {
    const url = getGasUrl();
    
    // Function to save locally
    const saveLocally = () => {
        const current = getPendingReports();
        savePendingReports([...current, { ...report, status: 'PENDING' }]);
    };

    // If no URL, just save locally
    if (!url) {
        saveLocally();
        return true;
    }

    try {
        // Try to send to Cloud
        const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'student_submit', data: report }) });
        const result = await response.json();
        if (result.status === 'success') {
            return true;
        } else {
            throw new Error(result.error || "Unknown cloud error");
        }
    } catch (e) {
        // Fallback to local on ANY error (network, server, parsing)
        console.error("Cloud send error, falling back to local:", e);
        saveLocally();
        return true; // Return true to indicate "Success" to the UI, even though it's local
    }
};

export const fetchPendingReportsCloud = async (): Promise<boolean> => {
    const url = getGasUrl();
    if (!url) return true; // Just use local
    try {
         const response = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'get_pending' }) });
         const result = await response.json();
         if (result.status === 'success' && result.data) {
             const currentLocal = getPendingReports();
             const newReports = result.data as PendingReport[];
             
             const mergedReports = [...currentLocal];
             newReports.forEach(cloudReport => {
                 const exists = mergedReports.find(local => local.id === cloudReport.id);
                 if (!exists) {
                     mergedReports.push({ ...cloudReport, status: 'PENDING' });
                 }
             });
             
             savePendingReports(mergedReports);
             return true;
         }
         return false;
    } catch(e) { return false; }
};
