
import { Student, Seat, AcademicRank, ROWS, COLS } from '../types';
import { addLog } from './logger';

export const autoArrangeSeating = (students: Student[]): Seat[] => {
  addLog('ALGORITHM', 'Bắt đầu chạy thuật toán xếp chỗ...');
  
  // 1. Initialize Grid
  let newSeats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      newSeats.push({ row: r, col: c, studentId: null });
    }
  }

  // 2. Classify Students
  const goodStudents = students.filter(s => s.rank === AcademicRank.GOOD);
  const fairStudents = students.filter(s => s.rank === AcademicRank.FAIR);
  const otherStudents = students.filter(s => s.rank !== AcademicRank.GOOD && s.rank !== AcademicRank.FAIR);

  // Shuffle arrays to randomize
  const shuffle = <T,>(array: T[]) => array.sort(() => Math.random() - 0.5);
  shuffle(goodStudents);
  shuffle(fairStudents);
  shuffle(otherStudents);

  // 3. Define Zones (2x2 Blocks)
  // Grid: 6 Rows x 8 Cols.
  // We divide grid into 12 distinct 2x2 Zones.
  // This approach strictly enforces distribution. 
  // Each "Table" (Row 0-3 and Row 4-7) contains 2 Zones.
  // By placing 1 Good Student in each Zone, we ensure each Group has one, 
  // and consequently each Table (which is 2 groups) has 2 (or at least 1).
  
  interface Zone {
      id: number;
      seats: {r: number, c: number}[];
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
              ]
          });
      }
  }

  // Shuffle zones so we don't always fill top-left first
  shuffle(zones);

  const placeStudent = (student: Student, r: number, c: number) => {
    const seatIndex = newSeats.findIndex(s => s.row === r && s.col === c);
    if (seatIndex !== -1 && newSeats[seatIndex].studentId === null) {
      newSeats[seatIndex].studentId = student.id;
      return true;
    }
    return false;
  };

  // Helper to place a student into a specific Zone
  const placeInZone = (student: Student, zone: Zone) => {
      // Find empty seats in this zone
      const availableSeats = zone.seats.filter(pos => {
          const seat = newSeats.find(s => s.row === pos.r && s.col === pos.c);
          return seat && seat.studentId === null;
      });

      if (availableSeats.length > 0) {
          // Pick random seat in zone
          const pick = availableSeats[Math.floor(Math.random() * availableSeats.length)];
          return placeStudent(student, pick.r, pick.c);
      }
      return false;
  };

  // 4. Distribute GOOD Students
  // Round-robin distribution into zones to ensure maximum spread
  let goodIdx = 0;
  
  // Pass 1: One Good student per Zone
  for (const zone of zones) {
      if (goodIdx < goodStudents.length) {
          placeInZone(goodStudents[goodIdx], zone);
          goodIdx++;
      }
  }

  // Pass 2: If we still have Good students (more than 12), fill zones again
  while (goodIdx < goodStudents.length) {
      // Find zones with most space? Or just random? 
      // Let's iterate zones again
      let placed = false;
      for (const zone of zones) {
           if (goodIdx < goodStudents.length) {
               if (placeInZone(goodStudents[goodIdx], zone)) {
                   goodIdx++;
                   placed = true;
               }
           }
      }
      // If we couldn't place anyone in a full pass (grid full), break
      if (!placed) break;
  }

  // 5. Distribute FAIR Students
  // Try to place Fair students in zones that *don't* have them yet to balance
  let fairIdx = 0;

  // Pass 1: Try to place 1 Fair student in each zone
  for (const zone of zones) {
      if (fairIdx < fairStudents.length) {
          placeInZone(fairStudents[fairIdx], zone);
          fairIdx++;
      }
  }

  // Fill remaining Fair students
  while (fairIdx < fairStudents.length) {
      const emptySeats = newSeats.filter(s => s.studentId === null);
      if (emptySeats.length === 0) break;
      const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
      placeStudent(fairStudents[fairIdx], randomSeat.row, randomSeat.col);
      fairIdx++;
  }

  // 6. Fill Others
  let otherIdx = 0;
  while (otherIdx < otherStudents.length) {
    const emptySeats = newSeats.filter(s => s.studentId === null);
    if (emptySeats.length === 0) break;
    const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
    placeStudent(otherStudents[otherIdx], randomSeat.row, randomSeat.col);
    otherIdx++;
  }

  addLog('ALGORITHM', 'Hoàn tất xếp chỗ (Thuật toán cân bằng nhóm).');
  return newSeats;
};
