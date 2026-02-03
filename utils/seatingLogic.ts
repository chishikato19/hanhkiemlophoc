
import { Student, Seat, AcademicRank, ROWS, COLS } from '../types';
import { addLog } from './logger';

export const autoArrangeSeating = (students: Student[]): Seat[] => {
  addLog('ALGORITHM', 'Bắt đầu chạy thuật toán phân bổ theo khối 2x2 và hàng ngang 4 chỗ...');
  
  // 1. Initialize Grid
  let newSeats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      newSeats.push({ row: r, col: c, studentId: null });
    }
  }

  // 2. Classify and Shuffle Students for randomness
  const shuffle = <T,>(array: T[]) => [...array].sort(() => Math.random() - 0.5);

  const goodStudents = shuffle(students.filter(s => s.rank === AcademicRank.GOOD));
  const fairStudents = shuffle(students.filter(s => s.rank === AcademicRank.FAIR));
  const otherStudents = shuffle(students.filter(s => s.rank !== AcademicRank.GOOD && s.rank !== AcademicRank.FAIR));

  // 3. Define 12 Zones (Each zone is a 2x2 block)
  // A table of 4 in a row is made of the top-halves or bottom-halves of two adjacent zones.
  // Zone Layout:
  // Pair 0-1: [Z0][Z1] | [Z2][Z3]
  // Pair 2-3: [Z4][Z5] | [Z6][Z7]
  // Pair 4-5: [Z8][Z9] | [Z10][Z11]
  interface ZoneInfo {
      id: number;
      coords: {r: number, c: number}[];
      assignedIds: string[];
      score: number;
  }

  const zones: ZoneInfo[] = [];
  let zoneIdCounter = 0;
  for (let r = 0; r < ROWS; r += 2) {
      for (let c = 0; c < COLS; c += 2) {
          zones.push({
              id: zoneIdCounter++,
              coords: [
                  { r, c }, { r, c: c + 1 },
                  { r: r + 1, c }, { r: r + 1, c: c + 1 }
              ],
              assignedIds: [],
              score: 0
          });
      }
  }

  // Helper to place student in zone
  const addToZone = (student: Student, zone: ZoneInfo, weight: number) => {
      if (zone.assignedIds.length < 4) {
          zone.assignedIds.push(student.id);
          zone.score += weight;
          return true;
      }
      return false;
  };

  // 4. STEP 1: Distribute GOOD students as "Cores" (1 per 2x2 zone)
  let goodPtr = 0;
  // Shuffle zones so we don't always fill the same ones first if we have < 12 Good students
  let shuffledZones = shuffle(zones);

  // Round 1: Give every zone 1 Good student if possible
  for (const zone of shuffledZones) {
      if (goodPtr < goodStudents.length) {
          if (addToZone(goodStudents[goodPtr], zone, 3)) {
              goodPtr++;
          }
      }
  }

  // Round 2: If we still have Good students, distribute them to balance
  while (goodPtr < goodStudents.length) {
      const targetZone = zones
          .filter(z => z.assignedIds.length < 4)
          .sort((a, b) => a.score - b.score)[0];
      if (!targetZone) break;
      if (addToZone(goodStudents[goodPtr], targetZone, 3)) {
          goodPtr++;
      } else break;
  }

  // 5. STEP 2: Fill zones WITHOUT Good students with 2-3 Fair students
  let fairPtr = 0;
  for (const zone of zones) {
      const hasGood = zone.assignedIds.some(id => 
          goodStudents.some(gs => gs.id === id)
      );

      if (!hasGood) {
          // Target 2 or 3 fair students to compensate
          const targetFair = fairStudents.length > fairPtr + 2 ? 3 : 2;
          let count = 0;
          while (count < targetFair && fairPtr < fairStudents.length) {
              if (addToZone(fairStudents[fairPtr], zone, 1.2)) {
                  fairPtr++;
                  count++;
              } else break;
          }
      }
  }

  // 6. STEP 3: Distribute remaining Fair students to lowest-scoring zones
  while (fairPtr < fairStudents.length) {
      const targetZone = zones
          .filter(z => z.assignedIds.length < 4)
          .sort((a, b) => a.score - b.score)[0];
      if (!targetZone) break;
      if (addToZone(fairStudents[fairPtr], targetZone, 1.2)) {
          fairPtr++;
      } else break;
  }

  // 7. STEP 4: Spread the "Other" students to fill the gaps evenly
  // This ensures physical occupancy is balanced across all 12 zones/tables
  let otherPtr = 0;
  while (otherPtr < otherStudents.length) {
      const targetZone = zones
          .filter(z => z.assignedIds.length < 4)
          .sort((a, b) => a.assignedIds.length - b.assignedIds.length)[0];
      if (!targetZone) break;
      if (addToZone(otherStudents[otherPtr], targetZone, 0)) {
          otherPtr++;
      } else break;
  }

  // 8. STEP 5: Final Placement into seats with horizontal consideration
  // Within each 2x2, we shuffle the assigned students but we could optimize 
  // to ensure "Good" students are separated if multiple exist in one block.
  zones.forEach(zone => {
      // Sort students in zone by rank: Good first, then Fair, then Other
      // Then we place them into the 4 slots of the 2x2 in a way that spreads them
      const zoneStudents = zone.assignedIds.map(id => students.find(s => s.id === id)!);
      const sortedInZone = [...zoneStudents].sort((a, b) => {
          const rankWeight = (r: AcademicRank) => r === AcademicRank.GOOD ? 2 : r === AcademicRank.FAIR ? 1 : 0;
          return rankWeight(b.rank) - rankWeight(a.rank);
      });

      // Placement pattern for 4 slots [TopL, TopR, BotL, BotR]
      // To balance the two horizontal rows, we don't want all "Good" in the top row.
      // Slotted indices: 0: (R, C), 1: (R, C+1), 2: (R+1, C), 3: (R+1, C+1)
      // We use a zig-zag or fixed spread for the strongest students
      const placementOrder = [0, 3, 1, 2]; // Spread strongest to (0,0) and (1,1) first
      
      sortedInZone.forEach((student, index) => {
          const slotIdx = placementOrder[index];
          const coord = zone.coords[slotIdx];
          const seatIndex = newSeats.findIndex(s => s.row === coord.r && s.col === coord.c);
          if (seatIndex !== -1) {
              newSeats[seatIndex].studentId = student.id;
          }
      });
  });

  addLog('ALGORITHM', `Sắp xếp hoàn tất. Đã phân bổ ${students.length} học sinh vào các bàn 4 chỗ và nhóm 2x2.`);
  return newSeats;
};
