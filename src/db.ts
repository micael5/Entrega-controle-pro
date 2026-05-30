/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Delivery, Expense, ExtraGoal, Config, AppState } from './types';

const STORAGE_KEY = 'entregacontrole_pro_db';

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp_aluguel',
    name: 'Aluguel',
    value: 800.00,
    dueDate: 20,
    isEditable: true,
  },
  {
    id: 'exp_compras',
    name: 'Compras do mês',
    value: 800.00,
    dueDate: 20,
    isEditable: true,
  },
  {
    id: 'exp_reserva',
    name: 'Reserva de emergência',
    value: 200.00,
    dueDate: 20,
    isEditable: true,
  },
  {
    id: 'exp_manutencao',
    name: 'Manutenção da bicicleta',
    value: 50.00,
    dueDate: 20,
    isEditable: true,
  }
];

const DEFAULT_CONFIG: Config = {
  ifoodValue: 7.00,
  quitaValue: 7.00,
};

// Initialize or load state
export function loadState(): AppState {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      const initialState: AppState = {
        deliveries: [],
        expenses: [...DEFAULT_EXPENSES],
        extraGoals: [],
        config: { ...DEFAULT_CONFIG },
        trips: [],
        maintenanceThresholdKm: 150,
        screenReaderActive: false,
        accumulatedGoalPendente: 0,
        goalAdjustments: [],
        decimoTerceiroTotal: 1500.00,
        feriasDias: 5,
        feriasValorDiario: 120.00,
        decimoTerceiroSaved: 0.00,
        feriasSaved: 0.00,
        annualReserveHistory: [],
      };
      saveState(initialState);
      return initialState;
    }
    const parsed = JSON.parse(rawData) as AppState;
    // Fallback checks just in case schema changes or structure is empty
    return {
      deliveries: parsed.deliveries || [],
      expenses: parsed.expenses && parsed.expenses.length > 0 ? parsed.expenses : [...DEFAULT_EXPENSES],
      extraGoals: parsed.extraGoals || [],
      config: parsed.config || { ...DEFAULT_CONFIG },
      trips: parsed.trips || [],
      maintenanceThresholdKm: parsed.maintenanceThresholdKm || 150,
      screenReaderActive: parsed.screenReaderActive !== undefined ? parsed.screenReaderActive : false,
      dayRegistrations: parsed.dayRegistrations || [],
      targetDivisionMode: parsed.targetDivisionMode || 'equal',
      keepOriginalGoalToggle: parsed.keepOriginalGoalToggle !== undefined ? parsed.keepOriginalGoalToggle : false,
      accumulatedGoalPendente: parsed.accumulatedGoalPendente !== undefined ? parsed.accumulatedGoalPendente : 0,
      goalAdjustments: parsed.goalAdjustments || [],
      decimoTerceiroTotal: parsed.decimoTerceiroTotal !== undefined ? parsed.decimoTerceiroTotal : 1500.00,
      feriasDias: parsed.feriasDias !== undefined ? parsed.feriasDias : 5,
      feriasValorDiario: parsed.feriasValorDiario !== undefined ? parsed.feriasValorDiario : 120.00,
      decimoTerceiroSaved: parsed.decimoTerceiroSaved !== undefined ? parsed.decimoTerceiroSaved : 0.00,
      feriasSaved: parsed.feriasSaved !== undefined ? parsed.feriasSaved : 0.00,
      annualReserveHistory: parsed.annualReserveHistory || [],
      widgetOptions: parsed.widgetOptions || {
        showMeta: true,
        showGanhos: true,
        showKm: true,
        showTempo: true,
        showStatus: true,
      },
    };
  } catch (err) {
    console.error('Error loading EntregaControle Pro state from database:', err);
    return {
      deliveries: [],
      expenses: [...DEFAULT_EXPENSES],
      extraGoals: [],
      config: { ...DEFAULT_CONFIG },
      trips: [],
      maintenanceThresholdKm: 150,
      screenReaderActive: false,
      dayRegistrations: [],
      targetDivisionMode: 'equal',
      keepOriginalGoalToggle: false,
      accumulatedGoalPendente: 0,
      goalAdjustments: [],
      widgetOptions: {
        showMeta: true,
        showGanhos: true,
        showKm: true,
        showTempo: true,
        showStatus: true,
      },
    };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving EntregaControle Pro state to database:', err);
  }
}
