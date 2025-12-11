
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
      // --- NHÓM KỶ LUẬT & NỀ NẾP (Vui nhộn/Nhắc nhở) ---
      { id: 'style_breaker', label: 'Style Phá Cách', icon: '👕', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'Đồng phục', description: 'Hay sáng tạo với đồng phục (Cần chỉnh đốn)' },
      { id: 'loud_speaker', label: 'Cái Loa Phường', icon: '📢', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'Nói chuyện', description: 'Giọng nói vang xa, át tiếng cô giáo' },
      { id: 'late_turtle', label: 'Rùa Tốc Độ', icon: '🐢', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'Đi muộn', description: 'Luôn đến lớp khi trống đã điểm' },
      { id: 'gossip_king', label: 'Thánh Buôn Chuyện', icon: '🦜', type: 'count_behavior', threshold: 5, targetBehaviorLabel: 'Nói chuyện', description: 'Có quá nhiều câu chuyện để kể trong giờ học' },
      { id: 'debt_king', label: 'Đại Gia Nợ Bài', icon: '📝', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'Không làm bài', description: 'Thường xuyên "quên" làm bài tập về nhà' },
      { id: 'goldfish', label: 'Não Cá Vàng', icon: '🐟', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'Không soạn bài', description: 'Hay quên sách vở, đồ dùng học tập' },
      { id: 'sleeping_beauty', label: 'Thánh Ngủ Gật', icon: '😴', type: 'improvement', threshold: 999, description: 'Gán thủ công: Hay mơ màng trong giờ học' },
      { id: 'messy_king', label: 'Vua Xả Rác', icon: '🗑️', type: 'improvement', threshold: 999, description: 'Gán thủ công: Ngăn bàn luôn đầy giấy vụn' },

      // --- NHÓM HỌC TẬP (Tích cực) ---
      { id: 'professor', label: 'Giáo Sư Biết Tuốt', icon: '🎓', type: 'count_behavior', threshold: 10, targetBehaviorLabel: 'Phát biểu', description: 'Cái gì cũng biết, hỏi gì cũng giơ tay' },
      { id: 'speed_god', label: 'Chiến Thần Tốc Độ', icon: '🚀', type: 'count_behavior', threshold: 5, targetBehaviorLabel: 'Làm bài tốt', description: 'Làm bài tập nhanh và chính xác nhất lớp' },
      { id: 'calligraphy', label: 'Vở Sạch Chữ Đẹp', icon: '✍️', type: 'improvement', threshold: 999, description: 'Gán thủ công: Trình bày bài vở như in' },
      { id: 'idea_tree', label: 'Cây Sáng Kiến', icon: '💡', type: 'improvement', threshold: 999, description: 'Gán thủ công: Luôn có cách giải bài mới lạ' },
      { id: 'math_pro', label: 'Thần Đồng Toán Học', icon: '➕', type: 'improvement', threshold: 999, description: 'Gán thủ công: Xuất sắc trong các môn Tự nhiên' },
      { id: 'literature_soul', label: 'Tâm Hồn Thi Sĩ', icon: '📚', type: 'improvement', threshold: 999, description: 'Gán thủ công: Văn hay chữ tốt' },
      { id: 'language_master', label: 'Bậc Thầy Ngoại Ngữ', icon: '🔡', type: 'improvement', threshold: 999, description: 'Gán thủ công: Phát âm chuẩn, từ vựng rộng' },

      // --- NHÓM LAO ĐỘNG & XÃ HỘI ---
      { id: 'clean_hero', label: 'Dũng Sĩ Diệt Khuẩn', icon: '🧹', type: 'count_behavior', threshold: 3, targetBehaviorLabel: 'trực nhật', description: 'Lớp học sạch bong kin kít nhờ bàn tay này' },
      { id: 'friendly_ambassador', label: 'Đại Sứ Thân Thiện', icon: '🤝', type: 'count_behavior', threshold: 5, targetBehaviorLabel: 'Giúp đỡ', description: 'Luôn sẵn sàng giúp đỡ mọi người' },
      { id: 'peacemaker', label: 'Người Bảo Vệ', icon: '🛡️', type: 'improvement', threshold: 999, description: 'Gán thủ công: Hay bênh vực kẻ yếu, can ngăn xích mích' },
      { id: 'comedian', label: 'Cây Hài Nhân Dân', icon: '🤡', type: 'improvement', threshold: 999, description: 'Gán thủ công: Mang lại tiếng cười cho cả lớp' },
      { id: 'nature_lover', label: 'Người Chăm Sóc', icon: '🌻', type: 'improvement', threshold: 999, description: 'Gán thủ công: Chăm sóc cây cối, góc thiên nhiên' },

      // --- CHUỖI & THÀNH TÍCH CAO (Streak) ---
      { id: 'fire_warrior', label: 'Chiến Binh Bất Bại', icon: '🔥', type: 'streak_good', threshold: 4, description: '4 tuần liên tiếp đạt Hạnh kiểm Tốt' },
      { id: 'angel_aura', label: 'Thiên Thần Áo Trắng', icon: '😇', type: 'no_violation_streak', threshold: 8, description: '8 tuần liên tiếp không vi phạm nội quy' },
      { id: 'rising_star', label: 'Mầm Non Triển Vọng', icon: '🌱', type: 'improvement', threshold: 1, description: 'Có sự tiến bộ vượt bậc so với tuần trước' },
      { id: 'silent_star', label: 'Sao Im Lặng', icon: '🤫', type: 'no_violation_streak', threshold: 2, description: 'Giữ trật tự rất tốt trong 2 tuần liền' },

      // --- VAI TRÒ & NĂNG KHIẾU (Thủ công) ---
      { id: 'justice_bao', label: 'Bao Công Nhí', icon: '⚖️', type: 'improvement', threshold: 999, description: 'Gán thủ công: Cán bộ lớp gương mẫu, công tâm' },
      { id: 'camera_man', label: 'Tai Mắt Của Lớp', icon: '📹', type: 'improvement', threshold: 999, description: 'Gán thủ công: Nắm bắt tình hình lớp siêu nhanh' },
      { id: 'sport_master', label: 'Kiện Tướng Thể Thao', icon: '⚽', type: 'improvement', threshold: 999, description: 'Gán thủ công: Giỏi các hoạt động vận động' },
      { id: 'idol_singer', label: 'Giọng Ca Vàng', icon: '🎤', type: 'improvement', threshold: 999, description: 'Gán thủ công: Hát hay, hay hát' },
      { id: 'artist_pro', label: 'Họa Sĩ Tài Ba', icon: '🎨', type: 'improvement', threshold: 999, description: 'Gán thủ công: Vẽ đẹp, trang trí lớp tốt' },
      { id: 'tech_wizard', label: 'Phù Thủy Công Nghệ', icon: '💻', type: 'improvement', threshold: 999, description: 'Gán thủ công: Giỏi máy tính, hỗ trợ kỹ thuật cho lớp' }
    ],
    rewards: [
      { id: 'r1', label: 'Kẹo mút', cost: 50, description: 'Một chiếc kẹo ngọt ngào', stock: -1 },
      { id: 'r2', label: 'Bút bi thiên long', cost: 100, description: 'Bút bi viết siêu mượt', stock: 20 },
      { id: 'r3', label: 'Thẻ miễn bài tập', cost: 500, description: 'Miễn làm bài tập về nhà 1 lần', stock: -1 },
      { id: 'r4', label: 'Vé chọn chỗ VIP', cost: 300, description: 'Được tự chọn chỗ ngồi trong 1 ngày', stock: -1 },
      { id: 'r5', label: 'DJ của lớp', cost: 150, description: 'Được chọn nhạc giờ ra chơi', stock: -1 }
    ],
    avatars: [
        // --- CŨ (Giữ lại) ---
        { id: 'av1', label: 'Hổ Mạnh Mẽ', url: '🐯', cost: 100 },
        { id: 'av2', label: 'Mèo May Mắn', url: '😺', cost: 100 },
        { id: 'av3', label: 'Cún Đáng Yêu', url: '🐶', cost: 100 },
        { id: 'av4', label: 'Gấu Trúc', url: '🐼', cost: 150 },
        { id: 'av5', label: 'Kỳ Lân', url: '🦄', cost: 500 },
        { id: 'av11', label: 'Người Ngoài Hành Tinh', url: '👽', cost: 250 },
        { id: 'av12', label: 'Robot', url: '🤖', cost: 200 },
        { id: 'av13', label: 'Bóng Ma Vui Vẻ', url: '👻', cost: 150 },
        { id: 'av14', label: 'Khủng Long', url: '🦖', cost: 300 },
        { id: 'av15', label: 'Vua Bóng Đá', url: '⚽', cost: 150 },
        { id: 'av16', label: 'Game Thủ', url: '🎮', cost: 150 },
        { id: 'av19', label: 'Ngầu Lòi', url: '😎', cost: 100 },
        { id: 'av21', label: 'Mặt Hề', url: '🤡', cost: 100 },
        { id: 'av22', label: 'Yêu Đời', url: '🥰', cost: 100 },

        // --- NGHỀ NGHIỆP NỮ (Mới) ---
        { id: 'av_f_1', label: 'Bác Sĩ', url: '👩‍⚕️', cost: 300 },
        { id: 'av_f_2', label: 'Cô Giáo', url: '👩‍🏫', cost: 250 },
        { id: 'av_f_3', label: 'Họa Sĩ', url: '👩‍🎨', cost: 250 },
        { id: 'av_f_4', label: 'Ca Sĩ', url: '👩‍🎤', cost: 300 },
        { id: 'av_f_5', label: 'Phi Hành Gia', url: '👩‍🚀', cost: 350 },
        { id: 'av_f_6', label: 'Đầu Bếp', url: '👩‍🍳', cost: 200 },
        { id: 'av_f_7', label: 'Nông Dân', url: '👩‍🌾', cost: 150 },
        { id: 'av_f_8', label: 'Lập Trình', url: '👩‍💻', cost: 300 },
        { id: 'av_f_9', label: 'Thám Tử', url: '🕵️‍♀️', cost: 250 },
        { id: 'av_f_10', label: 'Cảnh Sát', url: '👮‍♀️', cost: 250 },
        { id: 'av_f_11', label: 'Lính Cứu Hỏa', url: '👩‍🚒', cost: 250 },
        { id: 'av_f_12', label: 'Thẩm Phán', url: '👩‍⚖️', cost: 350 },
        { id: 'av_f_13', label: 'Nhà Khoa Học', url: '👩‍🔬', cost: 300 },
        { id: 'av_f_14', label: 'Phi Công', url: '👩‍✈️', cost: 300 },
        { id: 'av_f_15', label: 'Doanh Nhân', url: '👩‍💼', cost: 300 },

        // --- NHÂN VẬT CỔ TÍCH / FANTASY NỮ (Mới) ---
        { id: 'av_f_16', label: 'Tiên Nữ', url: '🧚‍♀️', cost: 400 },
        { id: 'av_f_17', label: 'Nàng Tiên Cá', url: '🧜‍♀️', cost: 400 },
        { id: 'av_f_18', label: 'Phù Thủy', url: '🧙‍♀️', cost: 350 },
        { id: 'av_f_19', label: 'Ma Cà Rồng', url: '🧛‍♀️', cost: 300 },
        { id: 'av_f_20', label: 'Công Chúa', url: '👸', cost: 500 },
        { id: 'av_f_21', label: 'Nữ Hoàng', url: '👑', cost: 600 },
        { id: 'av_f_22', label: 'Thần Đèn', url: '🧞‍♀️', cost: 400 },
        { id: 'av_f_23', label: 'Yêu Tinh', url: '🧝‍♀️', cost: 350 },
        { id: 'av_f_24', label: 'Siêu Anh Hùng', url: '🦸‍♀️', cost: 350 },
        { id: 'av_f_25', label: 'Cô Dâu', url: '👰', cost: 400 },

        // --- HOẠT ĐỘNG & PHONG CÁCH (Mới) ---
        { id: 'av_f_26', label: 'Vũ Công', url: '💃', cost: 250 },
        { id: 'av_f_27', label: 'Yoga', url: '🧘‍♀️', cost: 200 },
        { id: 'av_f_28', label: 'Thể Dục', url: '🤸‍♀️', cost: 200 },
        { id: 'av_f_29', label: 'Bơi Lội', url: '🏊‍♀️', cost: 200 },
        { id: 'av_f_30', label: 'Lướt Sóng', url: '🏄‍♀️', cost: 250 },
        { id: 'av_f_31', label: 'Làm Nail', url: '💅', cost: 150 },
        { id: 'av_f_32', label: 'Cắt Tóc', url: '💇‍♀️', cost: 150 },
        { id: 'av_f_33', label: 'Thư Giãn', url: '💆‍♀️', cost: 150 },
        { id: 'av_f_34', label: 'Mua Sắm', url: '🛍️', cost: 200 },

        // --- DỄ THƯƠNG (Mới) ---
        { id: 'av_f_35', label: 'Thỏ Con', url: '🐰', cost: 150 },
        { id: 'av_f_36', label: 'Mèo Con', url: '🐱', cost: 150 },
        { id: 'av_f_38', label: 'Bướm Xinh', url: '🦋', cost: 150 },
        { id: 'av_f_40', label: 'Cánh Cụt', url: '🐧', cost: 150 },
        { id: 'av_f_41', label: 'Hồng Hạc', url: '🦩', cost: 200 },
        { id: 'av_f_42', label: 'Cá Heo', url: '🐬', cost: 200 },

        // --- CON NGƯỜI (Mới) ---
        { id: 'av_f_43', label: 'Bạn Gái', url: '👧', cost: 100 },
        { id: 'av_f_44', label: 'Phụ Nữ', url: '👩', cost: 100 },
        { id: 'av_f_45', label: 'Tóc Vàng', url: '👱‍♀️', cost: 120 },
        { id: 'av_f_46', label: 'Tóc Xoăn', url: '👩‍🦱', cost: 120 },
        { id: 'av_f_47', label: 'Tóc Đỏ', url: '👩‍🦰', cost: 120 },
        { id: 'av_f_48', label: 'Bà Hiền', url: '👵', cost: 100 },
        { id: 'av_f_49', label: 'Che Mặt', url: '🙈', cost: 150 },
        { id: 'av_f_50', label: 'Mẹ Bầu', url: '🤰', cost: 150 }
    ]
  },
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
    balance: Math.floor(Math.random() * 200), // Random starting coins
    badges: i < 5 ? ['fire_warrior'] : [], // Top 5 students have a badge
    inventory: [],
    avatarUrl: undefined,
    ownedAvatars: []
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
      note: 'Trong giờ Toán',
      status: 'PENDING'
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
      note: 'Đến sau trống 5p',
      status: 'PENDING'
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
    badges: s.badges || [],
    inventory: s.inventory || [],
    avatarUrl: s.avatarUrl || undefined,
    ownedAvatars: s.ownedAvatars || []
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
          avatars: parsed.gamification?.avatars || defaultSettings.gamification.avatars,
          coinRules: { ...defaultSettings.gamification.coinRules, ...(parsed.gamification?.coinRules || {}) }
        },
        lockedWeeks: parsed.lockedWeeks || [],
        semesterTwoStartWeek: parsed.semesterTwoStartWeek || defaultSettings.semesterTwoStartWeek,
        processedWeeks: parsed.processedWeeks || []
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
    version: '2.4'
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
        // Try parsing JSON, if fail, usually means HTML error page
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
             throw new Error("Dữ liệu trả về không phải JSON (Có thể do lỗi quyền truy cập hoặc URL sai). Hãy kiểm tra lại Permissions là 'Anyone'.");
        }

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

export const sendStudentReport = async (report: PendingReport): Promise<boolean> => {
    const url = getGasUrl();
    // Fallback to local
    if (!url) {
        const current = getPendingReports();
        savePendingReports([...current, { ...report, status: 'PENDING' }]);
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
             const currentLocal = getPendingReports();
             const newReports = result.data as PendingReport[];
             
             // Merge strategy: Keep local state if exists (preserving APPROVED/REJECTED), add new ones as PENDING
             const mergedReports = [...currentLocal];
             
             newReports.forEach(cloudReport => {
                 const exists = mergedReports.find(local => local.id === cloudReport.id);
                 if (!exists) {
                     // Add new report from cloud
                     mergedReports.push({ ...cloudReport, status: 'PENDING' });
                 }
                 // If exists, we ignore cloud version to respect local processing status
             });
             
             savePendingReports(mergedReports);
             return true;
         }
         return false;
    } catch(e) { return false; }
};
