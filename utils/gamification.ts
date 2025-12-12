
import { Student, ConductRecord, Settings, BadgeConfig, RewardItem, AvatarItem, FrameItem } from '../types';

/**
 * Calculate potential coins for a specific week based on rules.
 */
export const calculateWeeklyCoins = (
    student: Student,
    record: ConductRecord | undefined,
    prevRecord: ConductRecord | undefined,
    settings: Settings
): number => {
    if (!record) return 0;
    
    let coins = 0;
    const rules = settings.gamification.coinRules;

    // 1. Weekly Rank
    if (record.score >= settings.thresholds.good) {
        coins += rules.weeklyGood;
    }

    // 2. Positive Behaviors
    if (record.positiveBehaviors) {
        coins += record.positiveBehaviors.length * rules.behaviorBonus;
    }

    // 3. Improvement
    if (prevRecord && record.score > prevRecord.score + 10) {
        coins += rules.improvement;
    }

    // 4. Clean Sheet (No Violations)
    if (record.violations.length === 0) {
        coins += rules.cleanSheet;
    }

    return coins;
};

/**
 * Analyze student history to find newly unlocked badges AND revoke badges if streaks are broken.
 * Returns the FULL updated list of badges for the student.
 */
export const checkBadges = (
    student: Student,
    records: ConductRecord[],
    settings: Settings
): string[] => {
    // Sort records descending (newest first) to check current streaks
    const studentRecordsDesc = records
        .filter(r => r.studentId === student.id)
        .sort((a, b) => b.week - a.week); // Week 10, 9, 8...
    
    // Sort ascending for cumulative counts
    const studentRecordsAsc = [...studentRecordsDesc].reverse();

    const currentBadges: Set<string> = new Set(student.badges || []);
    const finalBadges: Set<string> = new Set(currentBadges);
    
    settings.gamification.badges.forEach(badge => {
        let isEligible = false;

        // --- CHECK 1: Streak Badges (Can be revoked) ---
        if (badge.type === 'streak_good') {
            // Check strictly the LAST N records. 
            // If the student misses a week of data, we skip it? Or count as break? 
            // Let's assume we check the last N *available* records, but strictly sequential weeks logic is harder.
            // Simplified: Check the last N records present.
            
            let streak = 0;
            // Iterate backwards from most recent
            for (const r of studentRecordsDesc) {
                if (r.score >= settings.thresholds.good) {
                    streak++;
                } else {
                    break; // Streak broken
                }
            }
            isEligible = streak >= badge.threshold;
            
            // Logic:
            // If Eligible -> Add/Keep
            // If Not Eligible AND currently has it -> Revoke (Remove)
            if (isEligible) {
                finalBadges.add(badge.id);
            } else if (currentBadges.has(badge.id)) {
                finalBadges.delete(badge.id); // REVOKE
            }
        }

        else if (badge.type === 'no_violation_streak') {
            let streak = 0;
            for (const r of studentRecordsDesc) {
                if (r.violations.length === 0) {
                    streak++;
                } else {
                    break; // Streak broken
                }
            }
            isEligible = streak >= badge.threshold;

            if (isEligible) {
                finalBadges.add(badge.id);
            } else if (currentBadges.has(badge.id)) {
                finalBadges.delete(badge.id); // REVOKE
            }
        }

        // --- CHECK 2: Cumulative/Milestone Badges (Usually permanent) ---
        // For these, we typically only ADD, rarely revoke unless manual.
        // However, if you want stricter logic, we can recalculate completely.
        // Let's keep them permanent (Add only) unless manual removal, 
        // to avoid losing "100 times" badge just because this week is 0.
        else if (badge.type === 'count_behavior' && badge.targetBehaviorLabel) {
            let count = 0;
            const target = badge.targetBehaviorLabel.toLowerCase();
            studentRecordsAsc.forEach(r => {
                if (r.positiveBehaviors) {
                    r.positiveBehaviors.forEach(p => {
                        const cleanP = p.replace(/\([+-]?\d+đ\)/, '').trim().toLowerCase();
                        if (cleanP.includes(target)) count++;
                    });
                }
            });
            if (count >= badge.threshold) {
                finalBadges.add(badge.id);
            }
        }
        else if (badge.type === 'improvement') {
            // "Improvement" is vague for a badge. Usually manual or one-time trigger.
            // We preserve existing manual assignments.
            // If we want auto-assignment:
            // Check if ANY record showed improvement.
            if (badge.threshold < 999) { // 999 usually marks manual
                 let hasImprovement = false;
                 for (let i = 1; i < studentRecordsAsc.length; i++) {
                     if (studentRecordsAsc[i].score > studentRecordsAsc[i-1].score + 10) {
                         hasImprovement = true;
                         break;
                     }
                 }
                 if (hasImprovement) finalBadges.add(badge.id);
            }
        }
    });

    return Array.from(finalBadges);
};

export const purchaseItem = (
    student: Student,
    item: RewardItem
): Student | null => {
    const currentBalance = student.balance || 0;
    if (currentBalance >= item.cost) {
        const newBalance = currentBalance - item.cost;
        const inventory = student.inventory || [];
        const existingItemIndex = inventory.findIndex(i => i.itemId === item.id);
        let newInventory = [...inventory];
        if (existingItemIndex > -1) {
            newInventory[existingItemIndex] = { 
                ...newInventory[existingItemIndex], 
                count: newInventory[existingItemIndex].count + 1 
            };
        } else {
            newInventory.push({ itemId: item.id, count: 1 });
        }
        return { 
            ...student, 
            balance: newBalance,
            inventory: newInventory
        };
    }
    return null;
};

export const useItem = (
    student: Student,
    itemId: string
): Student | null => {
    const inventory = student.inventory || [];
    const itemIndex = inventory.findIndex(i => i.itemId === itemId);

    if (itemIndex === -1) return null;

    const currentItem = inventory[itemIndex];
    let newInventory = [...inventory];
    
    if (currentItem.count > 1) {
        newInventory[itemIndex] = { ...currentItem, count: currentItem.count - 1 };
    } else {
        newInventory = newInventory.filter(i => i.itemId !== itemId);
    }

    return {
        ...student,
        inventory: newInventory
    };
};

export const purchaseAvatar = (
    student: Student,
    avatar: AvatarItem
): Student | null => {
    const currentBalance = student.balance || 0;
    if ((student.ownedAvatars || []).includes(avatar.id)) {
        return { ...student, avatarUrl: avatar.url };
    }
    if (currentBalance >= avatar.cost) {
        const newBalance = currentBalance - avatar.cost;
        const newOwned = [...(student.ownedAvatars || []), avatar.id];
        return {
            ...student,
            balance: newBalance,
            ownedAvatars: newOwned,
            avatarUrl: avatar.url
        };
    }
    return null;
}

export const equipAvatar = (
    student: Student,
    avatar: AvatarItem
): Student => {
    return { ...student, avatarUrl: avatar.url };
}

// --- Frame Logic ---

export const purchaseFrame = (
    student: Student,
    frame: FrameItem
): Student | null => {
    const currentBalance = student.balance || 0;
    if ((student.ownedFrames || []).includes(frame.id)) {
        return { ...student, frameUrl: frame.image };
    }
    if (currentBalance >= frame.cost) {
        const newBalance = currentBalance - frame.cost;
        const newOwned = [...(student.ownedFrames || []), frame.id];
        return {
            ...student,
            balance: newBalance,
            ownedFrames: newOwned,
            frameUrl: frame.image
        };
    }
    return null;
}

export const equipFrame = (
    student: Student,
    frame: FrameItem
): Student => {
    return { ...student, frameUrl: frame.image };
}
