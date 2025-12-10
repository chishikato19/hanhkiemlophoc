
import { BehaviorItem } from '../types';

export const formatItemWithPoints = (name: string, configItems: BehaviorItem[]) => {
    if (name.match(/\([+-]?\d+đ\)/)) return name;
    const item = configItems.find(i => i.label === name);
    if (item) {
        const sign = item.points > 0 ? '+' : '';
        return `${name} (${sign}${item.points}đ)`;
    }
    return name;
};

export const cleanLabel = (label: string): string => {
  return label.replace(/\s*\([+-]?\d+đ\)/g, '').replace(/\s*\(x\d+\)/g, '').trim();
};

export const formatGroupedList = (items: string[], configItems: BehaviorItem[]): string[] => {
    const counts = items.reduce((acc, item) => { acc[item] = (acc[item] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => {
        const displayName = formatItemWithPoints(name, configItems);
        return count > 1 ? `${displayName} (x${count})` : displayName;
    });
};
