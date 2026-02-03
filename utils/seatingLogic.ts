
import { Student, Seat, AcademicRank, ROWS, COLS } from '../types';
import { addLog } from './logger';

export const autoArrangeSeating = (students: Student[]): Seat[] => {
  addLog('ALGORITHM', 'Bắt đầu chạy thuật toán xếp chỗ thông minh v4.4...');
  
  // 1. Initialize Grid
  let newSeats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      newSeats.push({ row: r, col: c, studentId: null });
    }
  }

  // 2. Classify and Shuffle Students
  const shuffle = <T,>(array: T[]) => [...array].sort(() => Math.random() - 0.5);
  
  // Priority students (VIP tickets) - these should be handled first or placed in front
  const vips = shuffle(students.filter(s => s.hasPrioritySeating));
  const nonVips = students.filter(s => !s.hasPrioritySeating);

  const goodStudents = shuffle(nonVips.filter(s => s.rank === AcademicRank.GOOD));
  const fairStudents = shuffle(nonVips.filter(s => s.rank === AcademicRank.FAIR));
  const otherStudents = shuffle(nonVips.filter(s => s.rank !== AcademicRank.GOOD && s.rank !== AcademicRank.FAIR));

  // 3. Define 12 Zones (2x2 Blocks)
  interface Zone {
      id: number;
      seats: {r: number, c: number}[];
      score: number;
  }

  const zones: Zone[] = [];
  let zoneId = 0;
  for (let r = 0; r < ROWS; r += 2) {
      for (let c = 0; c < COLS; c += 2) {
          zones.push({
              id: zoneId++,
              seats: [
                  { r, c }, { r, c: c + 1 },
                  { r: r + 1, c }, { r: r + 1, c: c + 1 }
              ],
              score: 0
          });
      }
  }

  const placeStudentInZone = (studentId: string, zone: Zone) => {
      const available = zone.seats.filter(pos => {
          const seat = newSeats.find(s => s.row === pos.r && s.col === pos.c);
          return seat && seat.studentId === null;
      });

      if (available.length > 0) {
          // If student is VIP, try to pick the seat in the smallest row (closest to board)
          let pick;
          if (students.find(s => s.id === studentId)?.hasPrioritySeating) {
              const minRow = Math.min(...available.map(a => a.r));
              const frontSeats = available.filter(a => a.r === minRow);
              pick = frontSeats[Math.floor(Math.random() * frontSeats.length)];
          } else {
              pick = available[Math.floor(Math.random() * available.length)];
          }

          const seatIndex = newSeats.findIndex(s => s.row === pick.r && s.col === pick.c);
          newSeats[seatIndex].studentId = studentId;
          return true;
      }
      return false;
  };

  // 4. STEP 0: Handle VIPs (Priority Seating)
  // We place VIPs in the front-most available zones first
  const sortedZonesByRow = [...zones].sort((a, b) => a.seats[0].r - b.seats[0].r);
  vips.forEach(vip => {
      for (const zone of sortedZonesByRow) {
          if (placeStudentInZone(vip.id, zone)) {
              // Update score based on VIP's academic rank
              if (vip.rank === AcademicRank.GOOD) zone.score += 3;
              else if (vip.rank === AcademicRank.FAIR) zone.score += 1.2;
              break;
          }
      }
  });

  // 5. STEP 1: Core Nucleus Distribution (At least 1 GOOD or 2-3 FAIR)
  // Distribute GOOD students to zones with lowest current score
  goodStudents.forEach(stu => {
      const targetZone = [...zones]
          .filter(z => z.seats.some(p => newSeats.find(s => s.row === p.r && s.col === p.c)?.studentId === null))
          .sort((a, b) => a.score - b.score)[0];
      
      if (targetZone && placeStudentInZone(stu.id, targetZone)) {
          targetZone.score += 3;
      }
  });

  // Distribute FAIR students to fill the gaps
  fairStudents.forEach(stu => {
      // Find zones that still have < 3 score (meaning no GOOD student yet) or just lowest score
      const targetZone = [...zones]
          .filter(z => z.seats.some(p => newSeats.find(s => s.row === p.r && s.col === p.c)?.studentId === null))
          .sort((a, b) => a.score - b.score)[0];

      if (targetZone && placeStudentInZone(stu.id, targetZone)) {
          targetZone.score += 1.2;
      }
  });

  // 6. STEP 2: Fill the remaining empty seats with Other Students
  otherStudents.forEach(stu => {
      const emptySeats = newSeats.filter(s => s.studentId === null);
      if (emptySeats.length > 0) {
          const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
          randomSeat.studentId = stu.id;
      }
  });

  addLog('ALGORITHM', 'Xếp chỗ hoàn tất: Đã cân bằng học lực giữa 12 nhóm (2x2).');
  return newSeats;
};
