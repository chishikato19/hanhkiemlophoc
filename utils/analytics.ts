
import { ConductRecord, Student, Settings, AcademicRank } from '../types';

export interface Alert {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  code: 'TREND' | 'RECURRING' | 'DROP' | 'THRESHOLD' | 'MISSING_DATA';
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
  currentWeek: number,
  activeWeeks: number[] = [],
  classWideViolationsMap: Record<number, string[]> = {} // Map of Week -> List of common violations
): Alert[] => {
  const alerts: Alert[] = [];
  
  // Sort records by week ascending
  const studentRecords = records
    .filter(r => r.studentId === student.id)
    .sort((a, b) => a.week - b.week);

  // 0. Check for Missing Data in Active Weeks
  activeWeeks.forEach(week => {
      if (week <= currentWeek) {
          const hasRecord = studentRecords.some(r => r.week === week);
          if (!hasRecord) {
              alerts.push({
                  type: 'WARNING',
                  code: 'MISSING_DATA',
                  message: `Chưa nhập dữ liệu Tuần ${week}.`
              });
          }
      }
  });

  if (studentRecords.length < 2) return alerts; 

  // 1. Analyze Sudden Drop
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

  // 2. Analyze Negative Trend
  const recentRecords = studentRecords.filter(r => r.week <= currentWeek);
  if (recentRecords.length >= 3) {
    const r1 = recentRecords[recentRecords.length - 1]; 
    const r2 = recentRecords[recentRecords.length - 2];
    const r3 = recentRecords[recentRecords.length - 3];
    
    if (r3.score > r2.score && r2.score > r1.score) {
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
  const recentViolationRecords = studentRecords
    .filter(r => r.week <= currentWeek && r.violations.length > 0)
    .slice(-3); 

  if (recentViolationRecords.length >= 2) {
    const violationCounts: Record<string, number> = {};
    
    recentViolationRecords.forEach(rec => {
      // Get class-wide violations for this specific week
      const ignoredInThisWeek = classWideViolationsMap[rec.week] || [];

      // Filter out class-wide violations from analysis
      const personalViolations = rec.violations
        .map(v => cleanLabel(v))
        .filter(vLabel => !ignoredInThisWeek.map(iv => cleanLabel(iv)).includes(vLabel));

      const uniqueViolationsInWeek = new Set(personalViolations);
      uniqueViolationsInWeek.forEach(v => {
        violationCounts[v] = (violationCounts[v] || 0) + 1;
      });
    });

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

  // 4. Threshold Danger
  const allScores = studentRecords.map(r => r.score);
  if (allScores.length > 0) {
      const totalAvg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
      
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

  // Determine active weeks
  const activeWeeksSet = new Set<number>();
  records.forEach(r => activeWeeksSet.add(r.week));
  const activeWeeks = Array.from(activeWeeksSet).sort((a,b) => a - b);

  // Identify Class-Wide Violations per Week
  // If a violation appears in > 75% of active students' records for a week, consider it Class-Wide
  const classWideViolationsMap: Record<number, string[]> = {};
  
  activeWeeks.forEach(week => {
      const weekRecords = records.filter(r => r.week === week);
      if (weekRecords.length === 0) return;

      const violationCounts: Record<string, number> = {};
      weekRecords.forEach(r => {
          r.violations.forEach(v => {
             // Use exact string or clean label? Use exact to be safe for now, or cleaned.
             // Using cleaned label for better matching
             const label = cleanLabel(v); 
             violationCounts[label] = (violationCounts[label] || 0) + 1;
          });
      });

      const totalStudentsInWeek = weekRecords.length;
      const commonvars: string[] = [];
      Object.entries(violationCounts).forEach(([label, count]) => {
          if (count > totalStudentsInWeek * 0.75) {
              commonvars.push(label);
          }
      });
      classWideViolationsMap[week] = commonvars;
  });

  students.forEach(student => {
    if (!student.isActive) return;
    const alerts = analyzeStudent(student, records, settings, currentWeek, activeWeeks, classWideViolationsMap);
    if (alerts.length > 0) {
      results.push({
        studentId: student.id,
        studentName: student.name,
        alerts
      });
    }
  });

  return results.sort((a, b) => {
    const aCrit = a.alerts.some(al => al.type === 'CRITICAL');
    const bCrit = b.alerts.some(al => al.type === 'CRITICAL');
    if (aCrit && !bCrit) return -1;
    if (!aCrit && bCrit) return 1;
    return b.alerts.length - a.alerts.length;
  });
};
