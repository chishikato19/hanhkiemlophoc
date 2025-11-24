import { Student, AcademicPerformance, Gender, GRID_COLS, GRID_ROWS } from '../types';

interface Seat {
  r: number;
  c: number;
  student: Student | null;
}

// Distance squared
const getDistanceSq = (r1: number, c1: number, r2: number, c2: number) => {
  return Math.pow(r1 - r2, 2) + Math.pow(c1 - c2, 2);
};

export const generateSeatingChart = (students: Student[]): Seat[] => {
  const TOTAL_SEATS = GRID_ROWS * GRID_COLS;
  const SEATS_PER_TABLE = 4;
  
  // 1. Initialize Empty Grid
  const seats: Seat[] = Array.from({ length: TOTAL_SEATS }).map((_, i) => ({
    r: Math.floor(i / GRID_COLS),
    c: i % GRID_COLS,
    student: null
  }));

  // We need to determine exactly which seats are "active" to avoid gaps.
  // We fill table by table.
  // Calculate exact number of tables needed.
  const numTablesNeeded = Math.ceil(students.length / SEATS_PER_TABLE);
  
  // To avoid "gaps > 1" in a table, we strictly assign the first N seats where N = students.length.
  // However, for the 2x2 group logic to work, we want to fill visually in 2x2 blocks? 
  // No, the requirement is "Tables 1,2,3,4".
  // Let's define the Active Indices strictly as the first K full tables + partial last table.
  // Actually, to satisfy "Min 3 per table", if we have remainder 1 or 2, we might want to steal from previous.
  // But the prompt says "Fix empty spots > 1". Strictly filling 4 per table until the last one handles this best.
  
  // Indices of seats that MUST be filled (or are available to be filled)
  // We use exactly students.length seats, plus maybe a few spares if we want spacing, 
  // but the user complained about gaps. So let's try to map students 1-to-1 to the first N seats.
  const activeSeatIndices = Array.from({ length: students.length }).map((_, i) => i);
  
  // However, `activeSeatIndices` are linear (0..N). In the grid, 0,1,2,3 is Table 1.
  // This aligns perfectly.

  const assignedIds = new Set<string>();
  const availableStudents = [...students];

  const place = (seatIdx: number, s: Student) => {
    seats[seatIdx].student = s;
    assignedIds.add(s.id);
  };

  // Helper: Get student details from a generic pool
  const popStudent = (
    predicate: (s: Student) => boolean, 
    pool: Student[] = availableStudents
  ): Student | undefined => {
    // Find candidate
    const candidates = pool.filter(s => !assignedIds.has(s.id) && predicate(s));
    if (candidates.length === 0) return undefined;
    
    // Pick random to vary results
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  };

  // ----------------------------------------------------------------
  // Constraints Checkers
  // ----------------------------------------------------------------
  
  // Table Indices: [ [0,1,2,3], [4,5,6,7], ... ]
  // Only consider tables that are "active" (have at least 1 seat index in our active range)
  const activeTables: number[][] = [];
  for(let i=0; i<numTablesNeeded; i++) {
     const tIds = [i*4, i*4+1, i*4+2, i*4+3].filter(x => x < seats.length); // bounded by grid
     activeTables.push(tIds);
  }

  // 2x2 Groups
  // Row 0,1 -> Group. Row 2,3 -> Group.
  // Cols 0,1 -> Group. Cols 2,3 -> Group...
  const activeGroups: number[][] = [];
  for (let r = 0; r < GRID_ROWS - 1; r += 2) {
    for (let c = 0; c < GRID_COLS - 1; c += 2) {
       const tl = r * GRID_COLS + c;
       const group = [tl, tl+1, tl+GRID_COLS, tl+GRID_COLS+1];
       // Only count this group if at least one seat is in our active count
       // actually, strictly speaking, we want to enforce Good student in *occupied* groups.
       if (group.some(idx => idx < students.length)) {
          activeGroups.push(group);
       }
    }
  }

  // ----------------------------------------------------------------
  // Phase 1: High Priority - GOOD Students for Tables & Groups
  // ----------------------------------------------------------------
  // We want to ensure 1 Good per Table AND 1 Good per Group.
  
  // Strategy: Identify "Key Positions" that overlap Table and Group.
  // Position 0 is in Table 1 and Group 1.
  // Position 2 is in Table 1 and Group 2.
  // If we place a Good student at 0, we solve Table 1 and Group 1.
  
  const neededGood = activeTables.length; // Approximate, might need more for groups
  
  // Let's iterate tables. For each table, pick a seat.
  // Try to pick a seat that ALSO helps an empty Group.
  
  activeTables.forEach(tableSeats => {
    // Check if table already has Good (unlikely at start)
    if (tableSeats.some(idx => seats[idx].student?.academic === AcademicPerformance.GOOD)) return;
    
    // Find a seat in this table that is part of an unsatisfied Group
    // Filter seats in this table that are inside an active range
    const validSeats = tableSeats.filter(idx => idx < students.length && seats[idx].student === null);
    if (validSeats.length === 0) return;

    // Sort valid seats by "Group Utility"
    validSeats.sort((a, b) => {
       const aInUnmetGroup = activeGroups.some(g => g.includes(a) && !g.some(si => seats[si].student?.academic === AcademicPerformance.GOOD));
       const bInUnmetGroup = activeGroups.some(g => g.includes(b) && !g.some(si => seats[si].student?.academic === AcademicPerformance.GOOD));
       return (bInUnmetGroup ? 1 : 0) - (aInUnmetGroup ? 1 : 0);
    });

    const s = popStudent(s => s.academic === AcademicPerformance.GOOD);
    if (s) place(validSeats[0], s);
  });

  // Pass 1.5: Check Groups again. If a Group has no Good student, place one.
  activeGroups.forEach(groupSeats => {
     if (groupSeats.some(idx => seats[idx].student?.academic === AcademicPerformance.GOOD)) return;
     
     // Find empty spot in group that is active
     const validSeats = groupSeats.filter(idx => idx < students.length && seats[idx].student === null);
     if (validSeats.length === 0) return;
     
     const s = popStudent(s => s.academic === AcademicPerformance.GOOD);
     if (s) place(validSeats[0], s);
  });

  // ----------------------------------------------------------------
  // Phase 2: Gender Balance (1 Male, 1 Female per Table)
  // ----------------------------------------------------------------
  
  activeTables.forEach(tableSeats => {
    // Check constraints only for fully active tables or significantly populated ones
    // We only care about spots that are valid ( < students.length )
    const validSeats = tableSeats.filter(idx => idx < students.length);
    if (validSeats.length < 2) return; // Can't enforce diversity on 1 person

    const hasMale = validSeats.some(idx => seats[idx].student?.gender === Gender.MALE);
    const hasFemale = validSeats.some(idx => seats[idx].student?.gender === Gender.FEMALE);
    
    // If missing Male
    if (!hasMale) {
       // Find empty spot?
       const empty = validSeats.find(idx => seats[idx].student === null);
       const male = popStudent(s => s.gender === Gender.MALE);
       if (male) {
         if (empty !== undefined) {
            place(empty, male);
         } else {
            // No empty spot, we might need to swap? 
            // For simplicity in this greedy algo, we skip swapping complex logic 
            // unless we have lots of conflicts. 
            // If the table is full of Females (from Phase 1 Good students?), we leave it.
         }
       }
    }

    // If missing Female
    if (!hasFemale) {
       const empty = validSeats.find(idx => seats[idx].student === null);
       const female = popStudent(s => s.gender === Gender.FEMALE);
       if (female) {
         if (empty !== undefined) place(empty, female);
       }
    }
  });


  // ----------------------------------------------------------------
  // Phase 3: Fill Remaining (Talkative Distancing)
  // ----------------------------------------------------------------
  
  // Identify remaining seats in the active range (0 to students.length - 1)
  const remainingSeats = activeSeatIndices.filter(idx => seats[idx].student === null);
  
  // Prioritize Talkative students
  const remainingTalkative = availableStudents.filter(s => !assignedIds.has(s.id) && s.isTalkative);
  
  remainingTalkative.forEach(s => {
    // Find best seat (max distance from other talkers)
    let bestIdx = -1;
    let maxMinDist = -1;

    // Recalculate candidate scores
    const candidates = activeSeatIndices.filter(idx => seats[idx].student === null);
    
    if (candidates.length === 0) return;

    candidates.forEach(idx => {
       const r = Math.floor(idx / GRID_COLS);
       const c = idx % GRID_COLS;
       let minDist = 9999;
       
       // Measure against PLACED talkative students
       activeSeatIndices.forEach(otherIdx => {
          if (seats[otherIdx].student?.isTalkative) {
             const or = Math.floor(otherIdx / GRID_COLS);
             const oc = otherIdx % GRID_COLS;
             const d = getDistanceSq(r, c, or, oc);
             if (d < minDist) minDist = d;
          }
       });
       
       if (minDist > maxMinDist) {
          maxMinDist = minDist;
          bestIdx = idx;
       }
    });

    // If no other talkers yet, random
    if (maxMinDist === 9999) {
       bestIdx = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (bestIdx !== -1) {
       place(bestIdx, s);
       // Remove from candidate search for next iteration to keep consistent
       // (implied by seats[bestIdx].student check)
    }
  });

  // ----------------------------------------------------------------
  // Phase 4: Fill the rest randomly
  // ----------------------------------------------------------------
  const rest = availableStudents.filter(s => !assignedIds.has(s.id));
  rest.forEach(s => {
     // Find first empty slot (to keep it compact)
     // or random empty slot?
     // User wants "No gaps > 1". Strictly filling front-to-back is best for that.
     // But we used activeSeatIndices which IS front-to-back.
     // So any empty slot in activeSeatIndices is a "gap" we need to fill.
     
     const empty = activeSeatIndices.find(idx => seats[idx].student === null);
     if (empty !== undefined) {
        place(empty, s);
     }
  });

  return seats;
};