
import { Student, ConductRecord, Settings, BadgeConfig, RewardItem, AvatarItem, FrameItem, PendingOrder } from '../types';

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

export const checkBadges = (
    student: Student,
    records: ConductRecord[],
    settings: Settings
): string[] => {
    const studentRecordsDesc = records
        .filter(r => r.studentId === student.id)
        .sort((a, b) => b.week - a.week);
    
    const studentRecordsAsc = [...studentRecordsDesc].reverse();

    const currentBadges: Set<string> = new Set(student.badges || []);
    const finalBadges: Set<string> = new Set(currentBadges);
    
    settings.gamification.badges.forEach(badge => {
        let isEligible = false;

        if (badge.type === 'streak_good') {
            let streak = 0;
            for (const r of studentRecordsDesc) {
                if (r.score >= settings.thresholds.good) {
                    streak++;
                } else {
                    break;
                }
            }
            isEligible = streak >= badge.threshold;
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
                    break;
                }
            }
            isEligible = streak >= badge.threshold;

            if (isEligible) {
                finalBadges.add(badge.id);
            } else if (currentBadges.has(badge.id)) {
                finalBadges.delete(badge.id); // REVOKE
            }
        }

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
            if (badge.threshold < 999) {
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

// --- Order System ---

export const createPurchaseOrder = (
    student: Student,
    item: RewardItem | AvatarItem | FrameItem,
    type: 'REWARD' | 'AVATAR' | 'FRAME'
): { success: boolean, student: Student, order?: PendingOrder } => {
    const currentBalance = student.balance || 0;
    
    if (currentBalance < item.cost) {
        return { success: false, student };
    }

    // Deduct balance tentatively
    const newBalance = currentBalance - item.cost;
    const updatedStudent = { ...student, balance: newBalance };

    const order: PendingOrder = {
        id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        studentId: student.id,
        studentName: student.name,
        itemId: item.id,
        itemName: item.label,
        itemType: type,
        cost: item.cost,
        timestamp: new Date().toISOString(),
        status: 'PENDING'
    };

    return { success: true, student: updatedStudent, order };
};

export const processOrder = (
    student: Student, 
    order: PendingOrder, 
    action: 'APPROVE' | 'REJECT',
    settings: Settings
): Student => {
    if (action === 'REJECT') {
        // Refund coins
        return { ...student, balance: (student.balance || 0) + order.cost };
    }

    // Approve: Add to inventory/owned list
    if (order.itemType === 'REWARD') {
        // Check if item is functional
        const itemConfig = settings.gamification.rewards.find(r => r.id === order.itemId);
        // Add to inventory
        const inventory = student.inventory || [];
        const existingIdx = inventory.findIndex(i => i.itemId === order.itemId);
        let newInventory = [...inventory];
        if (existingIdx > -1) {
            newInventory[existingIdx] = { ...newInventory[existingIdx], count: newInventory[existingIdx].count + 1 };
        } else {
            newInventory.push({ itemId: order.itemId, count: 1 });
        }
        return { ...student, inventory: newInventory };
    } 
    else if (order.itemType === 'AVATAR') {
        const itemConfig = settings.gamification.avatars.find(a => a.id === order.itemId);
        const owned = student.ownedAvatars || [];
        if (!owned.includes(order.itemId)) {
             return { ...student, ownedAvatars: [...owned, order.itemId] };
        }
    }
    else if (order.itemType === 'FRAME') {
        const itemConfig = settings.gamification.frames.find(f => f.id === order.itemId);
        const owned = student.ownedFrames || [];
        if (!owned.includes(order.itemId)) {
             return { ...student, ownedFrames: [...owned, order.itemId] };
        }
    }
    return student;
};

// --- Usage Logic ---

export const useFunctionalItem = (
    student: Student,
    itemId: string,
    settings: Settings
): Student | null => {
    const inventory = student.inventory || [];
    const itemIndex = inventory.findIndex(i => i.itemId === itemId);
    const itemConfig = settings.gamification.rewards.find(r => r.id === itemId);

    if (itemIndex === -1 || !itemConfig) return null;

    // Logic for specific types
    let updatedStudent = { ...student };

    if (itemConfig.type === 'SEAT_TICKET') {
        updatedStudent.hasPrioritySeating = true;
    }
    // IMMUNITY is handled in InboxManager via a button, but if manually used here:
    // We just consume it. The teacher manually removes violation. 
    
    const currentItem = inventory[itemIndex];
    let newInventory = [...inventory];
    
    if (currentItem.count > 1) {
        newInventory[itemIndex] = { ...currentItem, count: currentItem.count - 1 };
    } else {
        newInventory = newInventory.filter(i => i.itemId !== itemId);
    }

    updatedStudent.inventory = newInventory;
    return updatedStudent;
};

// These direct purchase functions are deprecated in favor of createPurchaseOrder for most flows,
// but kept for admin overrides or direct usage if config allows.
export const purchaseItem = (
    student: Student,
    item: RewardItem
): Student | null => {
   // Legacy direct buy
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
    // This is now just a wrapper for compatibility or standard consumption
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

    return { ...student, inventory: newInventory };
};

export const equipAvatar = (student: Student, avatar: AvatarItem): Student => {
    return { ...student, avatarUrl: avatar.url };
}

export const equipFrame = (student: Student, frame: FrameItem): Student => {
    return { ...student, frameUrl: frame.image };
}
