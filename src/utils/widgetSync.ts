import { AppState } from '../types';

/**
 * Calculates current status and broadcasts it to both Native Android SharedPreferences 
 * and modern Browser/PWA Widget layers.
 */
export function transmitWidgetData(state: AppState): void {
  try {
    // 1. Core conversions matching HomeView computations
    const totalGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
    const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
    const metaTotal = totalDespesas + totalObjetivosExtras;

    const baseDailyTarget = totalDespesas / 30;
    const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
      return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
    }, 0);

    // Date calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(currentMonthStr));
    const offDays = currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta');
    const numOffDays = offDays.length;
    const numWorkDays = Math.max(1, 30 - numOffDays);

    // Dynamic reserves target calculation
    const monthsRemaining = Math.max(1, 12 - (currentMonth + 1) + 1);

    const decimoTerceiroTotal = state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00;
    const decimoTerceiroMensal = decimoTerceiroTotal / monthsRemaining;
    const decimoTerceiroUnadjustedDaily = decimoTerceiroMensal / 30;

    const feriasDias = state.feriasDias !== undefined ? state.feriasDias : 5;
    const feriasValorDiario = state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00;
    const feriasTotal = feriasDias * feriasValorDiario;
    const feriasMensal = feriasTotal / monthsRemaining;
    const feriasUnadjustedDaily = feriasMensal / 30;

    const totalDailyTarget = baseDailyTarget + extraDailyTarget + decimoTerceiroUnadjustedDaily + feriasUnadjustedDaily;

    const todayStrDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayReg = (state.dayRegistrations || []).find(reg => reg.date === todayStrDate);
    const todayStatus = todayReg ? todayReg.status : 'trabalho';
    const isOffToday = todayStatus === 'folga' || todayStatus === 'falta';

    let adjustedDailyTargetForWorkingDays = totalDailyTarget;
    if (!state.keepOriginalGoalToggle) {
      if (state.targetDivisionMode === 'concentrate') {
        adjustedDailyTargetForWorkingDays = (totalDailyTarget * 30 / numWorkDays) * 1.25;
      } else {
        adjustedDailyTargetForWorkingDays = totalDailyTarget * 30 / numWorkDays;
      }
    }

    const activeTodayTarget = isOffToday ? 0 : (adjustedDailyTargetForWorkingDays + (state.accumulatedGoalPendente || 0));

    // Filter today's items
    const todayStr = new Date().toDateString();
    const hojeGanhos = state.deliveries
      .filter(del => new Date(del.timestamp).toDateString() === todayStr)
      .reduce((sum, del) => sum + del.value, 0);

    const trips = state.trips || [];
    const totalKmHoje = trips
      .filter(t => new Date(t.date).toDateString() === todayStr)
      .reduce((sum, t) => sum + t.km, 0);

    const todayTrips = trips.filter(t => new Date(t.date).toDateString() === todayStr);
    const totalSecondsHoje = todayTrips.reduce((sum, t) => sum + t.durationSeconds, 0);
    const hoursHoje = Math.floor(totalSecondsHoje / 3600);
    const minsHoje = Math.floor((totalSecondsHoje % 3600) / 60);
    const workedTimeStr = `${String(hoursHoje).padStart(2, '0')}h${String(minsHoje).padStart(2, '0')}min`;

    // 2. Prepare payload structure
    const payload = {
      today_is_off: isOffToday,
      today_earnings: hojeGanhos,
      today_target: activeTodayTarget,
      today_km: totalKmHoje,
      today_time: workedTimeStr,
      opt_showMeta: state.widgetOptions?.showMeta !== false,
      opt_showGanhos: state.widgetOptions?.showGanhos !== false,
      opt_showKm: state.widgetOptions?.showKm !== false,
      opt_showTempo: state.widgetOptions?.showTempo !== false,
      opt_showStatus: state.widgetOptions?.showStatus !== false,
    };

    console.log('📡 Transmitindo dados para o widget nativo no celular:', payload);

    // 3. Inject and trigger native SharedPreferences bridge if running within WebView containers
    // Trigger window interfaces for Cordova, Capacitor, or custom WebView containers
    const win = window as any;
    if (win.AndroidWidgetBridge && win.AndroidWidgetBridge.updateWidgetData) {
      win.AndroidWidgetBridge.updateWidgetData(JSON.stringify(payload));
    } else if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.Preferences) {
      // Capacitor Preferences compatibility
      const { Preferences } = win.Capacitor.Plugins;
      Preferences.set({ key: 'today_is_off', value: String(isOffToday) });
      Preferences.set({ key: 'today_earnings', value: String(hojeGanhos) });
      Preferences.set({ key: 'today_target', value: String(activeTodayTarget) });
      Preferences.set({ key: 'today_km', value: String(totalKmHoje) });
      Preferences.set({ key: 'today_time', value: workedTimeStr });
      Preferences.set({ key: 'opt_showMeta', value: String(payload.opt_showMeta) });
      Preferences.set({ key: 'opt_showGanhos', value: String(payload.opt_showGanhos) });
      Preferences.set({ key: 'opt_showKm', value: String(payload.opt_showKm) });
      Preferences.set({ key: 'opt_showTempo', value: String(payload.opt_showTempo) });
      Preferences.set({ key: 'opt_showStatus', value: String(payload.opt_showStatus) });
    }

    // 4. Update standard service worker standard state if supported (PWA Widget support)
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_WIDGET_DATA',
        data: payload
      });
    }

    // Modern experimental browser widget sync support
    const pwaWidgets = (navigator as any).widgets;
    if (pwaWidgets && pwaWidgets.updateByTag) {
      pwaWidgets.updateByTag('entregacontrole_widget_4x2', {
        today_is_off: isOffToday,
        today_earnings: `R$ ${hojeGanhos.toFixed(2)}`,
        today_target: isOffToday ? 'Folga' : `R$ ${activeTodayTarget.toFixed(2)}`,
        today_km: `${totalKmHoje.toFixed(1)} km`,
        today_time: workedTimeStr,
        last_updated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    }
  } catch (error) {
    console.warn('Cannot broadcast updates to cellular system widgets yet: ', error);
  }
}
