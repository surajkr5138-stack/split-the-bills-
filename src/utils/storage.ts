import { Group } from '../types';
import { INITIAL_GROUPS } from './demoData';

const STORAGE_KEY = 'splitsquad_groups_v1';
const ACTIVE_GROUP_KEY = 'splitsquad_active_group_id';

export function loadGroups(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load groups from localStorage', e);
  }
  // Initialize with demo data
  saveGroups(INITIAL_GROUPS);
  return INITIAL_GROUPS;
}

export function saveGroups(groups: Group[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to save groups to localStorage', e);
  }
}

export function loadActiveGroupId(groups: Group[]): string {
  try {
    const savedId = localStorage.getItem(ACTIVE_GROUP_KEY);
    if (savedId && groups.some((g) => g.id === savedId)) {
      return savedId;
    }
  } catch (e) {
    console.error('Failed to get active group id', e);
  }
  return groups[0]?.id || '';
}

export function saveActiveGroupId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_GROUP_KEY, id);
  } catch (e) {
    console.error('Failed to save active group id', e);
  }
}

export function resetToDemoData(): Group[] {
  saveGroups(INITIAL_GROUPS);
  saveActiveGroupId(INITIAL_GROUPS[0].id);
  return INITIAL_GROUPS;
}
