
import { ConductRecord, Student, Settings, AcademicRank } from '../types';

export interface Alert {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  code: 'TREND' | 'RECURRING' | 'DROP' | 'THRESHOLD';
}

export interface StudentAnalysis {
  studentId: string;
  studentName: string;
  alerts: Alert[];
}

// Helper to strip points and counts from violation label
// e.g. "Talking (-2đ) (x2)" -> "Talking"
const cleanLabel = (label: string): string => {
  return label.replace(/\s*\([+-]?\d+đ\)/g, '').replace(/\s*\(x\d+\)/g, '').trim();
};

export const analyzeStudent = (
  student: Student,
  records: ConductRecord[],
  settings: Settings,
  currentWeek: number
): Alert[] => {
  const alerts: Alert[] = [];
  
  // Sort records by week ascending
  const studentRecords = records
    .filter(r => r.studentId === student.id)
    .sort((a, b) => a.week - b.week);

  if (studentRecords.length < 2) return [];

  // 1. Analyze Sudden Drop (Compared to previous 3-week average)
  const currentRecord = studentRecords.find(r => r.week === currentWeek);
  if (currentRecord) {
    const prevRecords = studentRecords.filter(r => r.week < currentWeek && r.week >= currentWeek - 3);
    if (prevRecords.length > 0) {
      const avgPrev = prevRecords.reduce((sum, r) => sum + r.score, 0) / prevRecords.length;
      if (avgPrev - currentRecord.score >= 15) {
        alerts.push({
          type: 'WARNING',
          code: 'DROP',
          message: `Điểm tụt bất thường (${currentRecord.score}đ) so với trung bình ${Math.round(avgPrev)}đ trước đó.`
        });
      }
    }
  }

  // 2. Analyze Negative Trend (3 consecutive drops)
  // We need at least 3 records ending at currentWeek or recent
  const recentRecords = studentRecords.filter(r => r.week <= currentWeek);
  if (recentRecords.length >= 3) {
    const r1 = recentRecords[recentRecords.length - 1]; // Newest
    const r2 = recentRecords[recentRecords.length - 2];
    const r3 = recentRecords[recentRecords.length - 3];
    
    // Check strict decline: r3 > r2 > r1
    if (r3.score > r2.score && r2.score > r1.score) {
       // Also ensure the drop is significant (e.g. > 5 points total)
       if (r3.score - r1.score > 5) {
         alerts.push({
           type: 'CRITICAL',
           code: 'TREND',
           message: `Phong độ đi xuống liên tiếp 3 tuần gần đây (${r3.score} -> ${r2.score} -> ${r1.score}).`
         });
       }
    }
  }

  // 3. Analyze Recurring Violations (Last 3 active weeks)
  // Get last 3 records that have violations
  const recentViolationRecords = studentRecords
    .filter(r => r.week <= currentWeek && r.violations.length > 0)
    .slice(-3); // Last 3

  if (recentViolationRecords.length >= 2) {
    // Count violation occurrences across weeks
    const violationCounts: Record<string, number> = {};
    
    recentViolationRecords.forEach(rec => {
      // Use Set to ensure we count "Attendance" only once per week per student
      const uniqueViolationsInWeek = new Set(rec.violations.map(v => cleanLabel(v)));
      uniqueViolationsInWeek.forEach(v => {
        violationCounts[v] = (violationCounts[v] || 0) + 1;
      });
    });

    // Check if any violation appears in all checked weeks (if >= 3 weeks checked) or at least 3 times
    Object.entries(violationCounts).forEach(([violation, count]) => {
      if (count >= 3) {
        alerts.push({
          type: 'WARNING',
          code: 'RECURRING',
          message: `Lỗi vi phạm lặp lại nhiều lần: "${violation}".`
        });
      }
    });
  }

  // 4. Threshold Danger (Semester context)
  // Calculate raw average up to now
  const allScores = studentRecords.map(r => r.score);
  const totalAvg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  
  // Check if hovering near a "Fail" or "Fair" boundary (within 2 points below threshold)
  // e.g. Threshold Good is 80. If Avg is 78 or 79.
  
  if (totalAvg < settings.thresholds.pass) {
       alerts.push({
          type: 'CRITICAL',
          code: 'THRESHOLD',
          message: `Điểm trung bình (${totalAvg}) đang ở mức Yếu/Kém.`
       });
  } else if (totalAvg >= settings.thresholds.pass && totalAvg < settings.thresholds.pass + 3) {
       alerts.push({
          type: 'WARNING',
          code: 'THRESHOLD',
          message: `Nguy cơ rớt xuống mức Yếu (Hiện tại: ${totalAvg}).`
       });
  }

  return alerts;
};

export const generateClassAnalysis = (
  students: Student[],
  records: ConductRecord[],
  settings: Settings,
  currentWeek: number
): StudentAnalysis[] => {
  const results: StudentAnalysis[] = [];

  students.forEach(student => {
    if (!student.isActive) return;
    const alerts = analyzeStudent(student, records, settings, currentWeek);
    if (alerts.length > 0) {
      results.push({
        studentId: student.id,
        studentName: student.name,
        alerts
      });
    }
  });

  // Sort by severity (CRITICAL first)
  return results.sort((a, b) => {
    const aCrit = a.alerts.some(al => al.type === 'CRITICAL');
    const bCrit = b.alerts.some(al => al.type === 'CRITICAL');
    if (aCrit && !bCrit) return -1;
    if (!aCrit && bCrit) return 1;
    return 0;
  });
};
