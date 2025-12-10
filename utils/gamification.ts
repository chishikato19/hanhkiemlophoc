
import { Student, ConductRecord, Settings, BadgeConfig, RewardItem } from '../types';

/**
 * Calculate potential coins for a specific week based on rules.
 * This is meant to be run when "finalizing" a week or previewing.
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
    // Each behavior counts once? Or total items? Usually each item.
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
 * Analyze student history to find new unlocked badges.
 * Returns a list of Badge IDs that the student has earned but doesn't have yet (or all earned).
 */
export const checkBadges = (
    student: Student,
    records: ConductRecord[],
    settings: Settings
): string[] => {
    const studentRecords = records
        .filter(r => r.studentId === student.id)
        .sort((a, b) => a.week - b.week);
    
    const unlockedBadges: Set<string> = new Set(student.badges || []);
    
    settings.gamification.badges.forEach(badge => {
        if (unlockedBadges.has(badge.id)) return; // Already has it

        let unlocked = false;

        if (badge.type === 'streak_good') {
            let streak = 0;
            let maxStreak = 0;
            studentRecords.forEach(r => {
                if (r.score >= settings.thresholds.good) streak++;
                else streak = 0;
                if (streak > maxStreak) maxStreak = streak;
            });
            if (maxStreak >= badge.threshold) unlocked = true;
        }

        if (badge.type === 'no_violation_streak') {
            let streak = 0;
            let maxStreak = 0;
            studentRecords.forEach(r => {
                if (r.violations.length === 0) streak++;
                else streak = 0;
                if (streak > maxStreak) maxStreak = streak;
            });
            if (maxStreak >= badge.threshold) unlocked = true;
        }

        if (badge.type === 'count_behavior' && badge.targetBehaviorLabel) {
            let count = 0;
            // Need to match loosely (e.g. "Speaking (+1)" matches "Speaking")
            const target = badge.targetBehaviorLabel.toLowerCase();
            studentRecords.forEach(r => {
                if (r.positiveBehaviors) {
                    r.positiveBehaviors.forEach(p => {
                        // Strip points for comparison
                        const cleanP = p.replace(/\([+-]?\d+đ\)/, '').trim().toLowerCase();
                        if (cleanP.includes(target)) count++;
                    });
                }
            });
            if (count >= badge.threshold) unlocked = true;
        }

        if (unlocked) {
            unlockedBadges.add(badge.id);
        }
    });

    return Array.from(unlockedBadges);
};

/**
 * Handle purchasing an item. Returns new balance if successful, or -1 if failed.
 */
export const purchaseItem = (
    student: Student,
    item: RewardItem
): number => {
    const currentBalance = student.balance || 0;
    if (currentBalance >= item.cost) {
        return currentBalance - item.cost;
    }
    return -1; // Not enough funds
};
