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

  // Shuffle arrays to randomize within rank
  const shuffle = <T,>(array: T[]) => array.sort(() => Math.random() - 0.5);
  shuffle(goodStudents);
  shuffle(fairStudents);
  shuffle(otherStudents);

  // 3. Define Groups (2x2 Blocks)
  // Grid is 6 rows, 8 cols. 
  // Left bank: Cols 0-3. Right bank: Cols 4-7.
  // Group logic: (Row i, Col j), (Row i, Col j+1), (Row i+1, Col j), (Row i+1, Col j+1)
  // Where j is 0, 2, 4, 6. And i is 0, 2, 4.
  const groups: { id: string, seats: { r: number, c: number }[] }[] = [];
  
  for (let r = 0; r < ROWS; r += 2) {
    for (let c = 0; c < COLS; c += 2) {
        // A 2x2 group
        groups.push({
            id: `G-${r}-${c}`,
            seats: [
                { r, c }, { r, c: c + 1 },
                { r: r + 1, c }, { r: r + 1, c: c + 1 }
            ]
        });
    }
  }

  // Helper to place student in a specific seat
  const placeStudent = (student: Student, r: number, c: number) => {
    const seatIndex = newSeats.findIndex(s => s.row === r && s.col === c);
    if (seatIndex !== -1 && newSeats[seatIndex].studentId === null) {
      newSeats[seatIndex].studentId = student.id;
      return true;
    }
    return false;
  };

  // 4. Distribute GOOD students
  // Requirement: Ensure at least 1 Good per table (row-bank) and 1 per Group.
  // Since Groups span 2 rows, placing 1 per group covers a lot, but we need to check rows.
  
  // Strategy: Place 1 Good student in each Group first.
  let goodIdx = 0;
  
  // First pass: 1 Good student per Group
  for (const group of groups) {
    if (goodIdx >= goodStudents.length) break;
    // Pick a random seat in the group
    const seat = group.seats[Math.floor(Math.random() * group.seats.length)];
    if (placeStudent(goodStudents[goodIdx], seat.r, seat.c)) {
        goodIdx++;
    }
  }

  // Second pass: Ensure 1 Good student per Table (Row-Bank) if not already met
  // Banks: Left (0-3), Right (4-7)
  for (let r = 0; r < ROWS; r++) {
      // Check Left Bank
      let hasGoodLeft = false;
      for(let c=0; c<4; c++) {
          const sId = newSeats.find(s => s.row === r && s.col === c)?.studentId;
          const stu = students.find(s => s.id === sId);
          if (stu?.rank === AcademicRank.GOOD) hasGoodLeft = true;
      }
      if (!hasGoodLeft && goodIdx < goodStudents.length) {
          // Find empty spot in this bank
           for(let c=0; c<4; c++) {
               if (placeStudent(goodStudents[goodIdx], r, c)) {
                   goodIdx++;
                   break;
               }
           }
      }

       // Check Right Bank
      let hasGoodRight = false;
      for(let c=4; c<8; c++) {
          const sId = newSeats.find(s => s.row === r && s.col === c)?.studentId;
          const stu = students.find(s => s.id === sId);
          if (stu?.rank === AcademicRank.GOOD) hasGoodRight = true;
      }
      if (!hasGoodRight && goodIdx < goodStudents.length) {
          // Find empty spot in this bank
           for(let c=4; c<8; c++) {
               if (placeStudent(goodStudents[goodIdx], r, c)) {
                   goodIdx++;
                   break;
               }
           }
      }
  }

  // Place remaining Good students randomly in empty spots
  while (goodIdx < goodStudents.length) {
      const emptySeats = newSeats.filter(s => s.studentId === null);
      if (emptySeats.length === 0) break;
      const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
      placeStudent(goodStudents[goodIdx], randomSeat.row, randomSeat.col);
      goodIdx++;
  }

  // 5. Distribute FAIR students evenly across groups
  // We want to balance the count of Good+Fair.
  let fairIdx = 0;
  
  // Iterate groups again to balance
  for (const group of groups) {
       // Count existing occupants
       // Check available spots
       const available = group.seats.filter(s => {
           const seat = newSeats.find(ns => ns.row === s.r && ns.col === s.c);
           return seat?.studentId === null;
       });
       
       if (available.length > 0 && fairIdx < fairStudents.length) {
           const pick = available[Math.floor(Math.random() * available.length)];
           placeStudent(fairStudents[fairIdx], pick.r, pick.c);
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

  // 6. Fill OTHERS
  let otherIdx = 0;
  while (otherIdx < otherStudents.length) {
    const emptySeats = newSeats.filter(s => s.studentId === null);
    if (emptySeats.length === 0) break;
    const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
    placeStudent(otherStudents[otherIdx], randomSeat.row, randomSeat.col);
    otherIdx++;
  }

  addLog('ALGORITHM', 'Hoàn tất xếp chỗ.');
  return newSeats;
};