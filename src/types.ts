/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Delivery {
  id: string;
  type: 'ifood' | 'quita';
  value: number;
  timestamp: string; // ISO string
}

export interface Expense {
  id: string;
  name: string;
  value: number;
  dueDate: number; // Day of the month (e.g. 20)
  isEditable: boolean; // Preloaded defaults are editable but let's store indicator
}

export interface ExtraGoal {
  id: string;
  name: string;
  targetValue: number;
  daysLimit: number; // Duration in days to reach the goal
  createdAt: string; // ISO string
}

export interface Config {
  ifoodValue: number;
  quitaValue: number;
}

export interface Trip {
  id: string;
  km: number;
  durationSeconds: number;
  avgSpeedKmH: number;
  date: string; // ISO string
  platform: 'ifood' | 'quita' | 'manual';
  value: number;
}

export type DayStatus = 'trabalho' | 'folga' | 'falta';

export interface DayRegistration {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

export interface GoalAdjustment {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
}

export interface AppState {
  deliveries: Delivery[];
  expenses: Expense[];
  extraGoals: ExtraGoal[];
  config: Config;
  trips: Trip[];
  maintenanceThresholdKm: number;
  screenReaderActive: boolean;
  dayRegistrations?: DayRegistration[];
  targetDivisionMode?: 'equal' | 'concentrate';
  keepOriginalGoalToggle?: boolean;
  accumulatedGoalPendente?: number;
  goalAdjustments?: GoalAdjustment[];
  widgetOptions?: {
    showMeta?: boolean;
    showGanhos?: boolean;
    showKm?: boolean;
    showTempo?: boolean;
    showStatus?: boolean;
  };
}
