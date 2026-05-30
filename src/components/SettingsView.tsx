/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Trash2, Calendar, DollarSign, RefreshCw, AlertTriangle, Plus, CheckCircle2, ChevronRight, Smartphone, Chrome, CalendarClock, Coffee, AlertCircle, Bell, BellRing, PiggyBank, TrendingUp, Sparkles } from 'lucide-react';
import { AppState, Expense, ExtraGoal } from '../types';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, triggerLocalNotification } from '../utils/notifications';
import { CalendarModal } from './CalendarModal';
import { transmitWidgetData } from '../utils/widgetSync';

interface SettingsViewProps {
  state: AppState;
  updateConfig: (ifoodValue: number, quitaValue: number) => void;
  deleteDelivery: (id: string) => void;
  updateExpense: (id: string, name: string, value: number, dueDate: number) => void;
  deleteExpense: (id: string) => void;
  addExpense: (name: string, value: number, dueDate: number) => void;
  resetToDefaults: () => void;
  updateDayStatus: (date: string, status: 'trabalho' | 'folga' | 'falta') => void;
  updateTargetDivisionMode: (mode: 'equal' | 'concentrate') => void;
  toggleKeepOriginalGoal: (keep: boolean) => void;
  updateWidgetOptions: (options: AppState['widgetOptions']) => void;
  updateAnnualReserveConfig: (decimoTotal: number, feriasDiasCount: number, feriasDiarioValue: number) => void;
}

export function SettingsView({
  state,
  updateConfig,
  deleteDelivery,
  updateExpense,
  deleteExpense,
  addExpense,
  resetToDefaults,
  updateDayStatus,
  updateTargetDivisionMode,
  toggleKeepOriginalGoal,
  updateWidgetOptions,
  updateAnnualReserveConfig
}: SettingsViewProps) {
  // Config state
  const [ifoodRate, setIfoodRate] = useState(state.config.ifoodValue.toString());
  const [quitaRate, setQuitaRate] = useState(state.config.quitaValue.toString());

  // Annual Reserve configuration inputs
  const [reserveDecimoTotal, setReserveDecimoTotal] = useState((state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500).toString());
  const [reserveFeriasDias, setReserveFeriasDias] = useState((state.feriasDias !== undefined ? state.feriasDias : 5).toString());
  const [reserveFeriasValorDiario, setReserveFeriasValorDiario] = useState((state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120).toString());
  const [isReserveConfigSaved, setIsReserveConfigSaved] = useState(false);
  const [reserveConfigError, setReserveConfigError] = useState('');
  
  // Notification states
  const [notifSupported] = useState(() => isNotificationSupported());
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  const handleRequestNotifPermission = async () => {
    setActionError('');
    setActionSuccess('');
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      setActionSuccess('🔔 Notificações ativadas com sucesso! Você receberá alertas do app!');
    } else if (res === 'denied') {
      setActionError('❌ Permissão de notificação negada. Ative nas configurações do Chrome/Celular para receber alertas.');
    }
  };

  const handleSendTestNotification = async () => {
    if (notifPermission !== 'granted') {
      setActionError('⚠️ Dê permissão primeiro clicando no botão "Ativar Notificações".');
      return;
    }
    setIsTestingNotif(true);
    try {
      await triggerLocalNotification(
        '🔔 Teste de Alerta Real!',
        'Isso é um exemplo de como você será alertado ao bater a meta ou precisar de manutenção! 🚀'
      );
      setActionSuccess('📲 Notificação de teste enviada! Verifique a barra de status do seu celular.');
    } catch (err) {
      setActionError('Erro ao enviar notificação de teste.');
    } finally {
      setIsTestingNotif(false);
    }
  };
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isUpdatingWidgetInSettings, setIsUpdatingWidgetInSettings] = useState(false);
  const [widgetSyncTimeStr, setWidgetSyncTimeStr] = useState('');

  // Edit Expense temporary states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpName, setEditExpName] = useState('');
  const [editExpValue, setEditExpValue] = useState('');
  const [editExpDueDate, setEditExpDueDate] = useState('');

  // Local success/error feedback banner
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // PWA capture event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isWaitingPrompt, setIsWaitingPrompt] = useState(false);
  const [showAutoPromptOverlay, setShowAutoPromptOverlay] = useState(() => {
    return window.location.search.includes('autoPrompt=true');
  });

  const handleTriggerAutoPrompt = async () => {
    setShowAutoPromptOverlay(false);
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (_) {}
    await handleAutoReinstall();
  };

  React.useEffect(() => {
    // Check if we have pre-saved PWA install prompt in global window
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleOpenDirectChrome = () => {
    const liveUrl = window.location.origin;
    window.open(liveUrl, '_blank');
  };

  const handleAutoReinstall = async () => {
    setActionError('');
    setActionSuccess('');

    // Se estiver aninhado no iframe de desenvolvimento do AI Studio, quebra para o link externo limpo imediatamente
    if (window.self !== window.top) {
      const cleanUrl = window.location.origin + '?autoPrompt=true';
      window.open(cleanUrl, '_blank');
      return;
    }

    // Busca o evento capturado
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;

    if (!promptEvent) {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        alert("✅ Você já está usando o aplicativo instalado!");
      } else {
        alert("⚠️ Aguarde carregar ou atualize a página. Se persistir, limpe dados do Chrome.");
      }
      return;
    }

    try {
      // ✅ CHAMA A JANELA DO SISTEMA
      promptEvent.prompt();

      // ESPERA EU CLICAR EM ADICIONAR OU CANCELAR
      const resultado = await promptEvent.userChoice;

      if (resultado.outcome === 'accepted') {
        alert("✅ INSTALADO COM SUCESSO! Ícone na tela inicial.");
        setActionSuccess('📲 Excelente! O ícone "EntregaControle Pro" foi adicionado com sucesso à sua Tela de Início!');
      } else {
        alert("❌ Você cancelou a instalação.");
        setActionSuccess('Instalação cancelada pelo usuário.');
      }
    } catch (err) {
      console.warn('Erro ao acionar prompt nativo:', err);
      setActionError('Não foi possível acionar a instalação automática do sistema.');
    }

    // Reseta
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
  };

  // Handle configuration update (iFood / Quita delivery rates)
  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const ifood = parseFloat(ifoodRate);
    const quita = parseFloat(quitaRate);

    if (isNaN(ifood) || ifood <= 0 || isNaN(quita) || quita <= 0) {
      setActionError('Os valores por entrega devem ser numéricos, positivos e maiores que zero.');
      return;
    }

    updateConfig(ifood, quita);
    setActionSuccess('Taxas por corrida gravadas com sucesso!');
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const monthsRemaining = Math.max(1, 12 - (currentMonth + 1) + 1);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const activeMonthsList = monthNames.slice(currentMonth).join(', ');

  const uniqueDaysWithGanhosCount = Array.from(
    new Set((state.deliveries || []).map(d => new Date(d.timestamp).toDateString()))
  ).length;
  const appAvgDailyEarnings = uniqueDaysWithGanhosCount > 0 
    ? (state.deliveries.reduce((sum, d) => sum + d.value, 0) / uniqueDaysWithGanhosCount) 
    : 120.00;

  const handleSaveReserveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const parsedDecimo = parseFloat(reserveDecimoTotal);
    if (isNaN(parsedDecimo) || parsedDecimo < 0) {
      setActionError('O valor total do décimo terceiro deve ser um número positivo.');
      return;
    }

    const parsedDias = parseInt(reserveFeriasDias);
    if (isNaN(parsedDias) || parsedDias < 0) {
      setActionError('Os dias de férias devem ser um número inteiro positivo.');
      return;
    }

    const parsedDiario = parseFloat(reserveFeriasValorDiario);
    if (isNaN(parsedDiario) || parsedDiario < 0) {
      setActionError('O valor diário de férias deve ser um número positivo.');
      return;
    }

    updateAnnualReserveConfig(parsedDecimo, parsedDias, parsedDiario);
    setActionSuccess('Configurações de reservas anuais salvas com sucesso! Os valores diários já estão somando automaticamente nas suas metas.');
    setTimeout(() => setActionSuccess(''), 4500);
  };



  // Start inline editing of an expense
  const startEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditExpName(exp.name);
    setEditExpValue(exp.value.toString());
    setEditExpDueDate(exp.dueDate.toString());
  };

  // Cancel inline editing
  const cancelEditExpense = () => {
    setEditingExpenseId(null);
  };

  // Save edited expense
  const handleSaveExpense = (id: string) => {
    setActionError('');
    setActionSuccess('');

    const val = parseFloat(editExpValue);
    const due = parseInt(editExpDueDate);

    if (!editExpName.trim()) {
      setActionError('O nome da despesa não pode estar vazio.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setActionError('O valor deve ser um número maior que zero.');
      return;
    }
    if (isNaN(due) || due < 1 || due > 31) {
      setActionError('O vencimento deve ser um dia válido (1 a 31).');
      return;
    }

    updateExpense(id, editExpName.trim(), val, due);
    setEditingExpenseId(null);
    setActionSuccess('Despesa atualizada com sucesso!');
    setTimeout(() => setActionSuccess(''), 3000);
  };

  // Clear database to defaults
  const handleWipeDatabase = () => {
    if (window.confirm('Atenção: deseja realmente limpar todo o histórico de entregas e restaurar as configurações padrão de fábrica? Esta ação não pode ser desfeita.')) {
      resetToDefaults();
      setIfoodRate('7.00');
      setQuitaRate('7.00');
      setActionSuccess('Banco de dados restaurado para as configurações de fábrica!');
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  return (
    <div id="settings_view_container" className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-2">
        <Settings size={22} className="text-slate-800" />
        <h1 className="text-xl font-bold font-display text-slate-800">
          Painel de Configurações do App
        </h1>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-xl p-4 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-500 rounded-xl p-4 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* SECTION 1: EDIT STANDARD DELIVERY RATES */}
      <div id="rates_settings" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <DollarSign size={20} className="text-brand-500" />
          <h2 className="font-bold text-slate-850 text-base">Valor Recebido por Corrida</h2>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Informe quanto você recebe por entrega completada no iFood e no Quita. Essa taxa é usada para aumentar seu caixa real imediatamente ao clicar nos botões de corrida correspondentes na tela inicial.
        </p>

        <form onSubmit={handleSaveRates} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Valor / Corrida iFood (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={ifoodRate}
              onChange={(e) => setIfoodRate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Valor / Corrida Quita (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={quitaRate}
              onChange={(e) => setQuitaRate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <button
            type="submit"
            className="sm:col-span-2 w-full bg-brand-500 hover:bg-brand-600 text-white cursor-pointer select-none font-bold text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Save size={16} /> Salvar Configuração de Taxas
          </button>
        </form>
      </div>

      {/* ⚙️ RESERVAS ANUAIS • FÉRIAS E DÉCIMO TERCEIRO */}
      <div id="annual_reserves_settings_card" className="bg-gradient-to-br from-amber-500/10 via-white to-blue-500/10 rounded-3xl p-6 shadow-md border-2 border-amber-300 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-amber-250">
          <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0 shadow-sm">
            <PiggyBank size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base font-display">⚙️ RESERVAS ANUAIS • FÉRIAS E DÉCIMO TERCEIRO</h2>
            <p className="text-[11px] text-slate-500 font-medium">Cálculo proporcional de metas CLT para autônomos</p>
          </div>
        </div>

        <div className="bg-amber-100/30 border border-amber-200/50 p-4 rounded-2xl text-xs text-slate-700 space-y-1.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 font-bold text-slate-800">
            <span>📅 Mês atual até dezembro ({monthNames[currentMonth]} ~ Dezembro):</span>
            <span className="bg-amber-500/20 text-amber-950 text-[10px] px-2.5 py-0.5 rounded-full font-black border border-amber-300/60 font-mono">
              {monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'} restantes
            </span>
          </div>
          <p className="text-[10px] text-slate-500 italic block">
            {activeMonthsList}
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed font-sans font-medium">
            Regra do app: O cálculo divide as metas pelos meses restantes até dezembro para embutir o valor diário de forma diluída e amigável na sua meta de pilotagem diária!
          </p>
        </div>

        <form onSubmit={handleSaveReserveConfig} className="space-y-4">
          <div className="space-y-5">
            {/* Bloco Décimo Terceiro */}
            <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/60 shadow-xs space-y-3">
              <span className="text-xs font-black text-amber-950 block uppercase tracking-wider">🔹 CONFIGURAÇÃO DO 13º SALÁRIO</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                    Valor desejado de 13º salário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 1500.00"
                    value={reserveDecimoTotal}
                    onChange={(e) => setReserveDecimoTotal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CÁLCULO AUTOMÁTICO DO 13º</span>
                  <div className="mt-1 space-y-1 font-mono text-[11px] text-slate-700 font-semibold">
                    <div>Por Mês ({monthsRemaining} meses): <b className="text-slate-900">R$ {parseFloat(reserveDecimoTotal) ? (parseFloat(reserveDecimoTotal) / monthsRemaining).toFixed(2) : '0.00'}</b></div>
                    <div>Soma na Meta Diária: <b className="text-amber-750 font-bold bg-amber-500/5 border border-amber-500/10 px-1 py-0.2 rounded-md">+ R$ {parseFloat(reserveDecimoTotal) ? (parseFloat(reserveDecimoTotal) / monthsRemaining / 30).toFixed(2) : '0.00'} / dia</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco Férias */}
            <div className="bg-white/80 p-4 rounded-2xl border border-blue-200/60 shadow-xs space-y-3">
              <span className="text-xs font-black text-blue-950 block uppercase tracking-wider">🔹 CONFIGURAÇÃO DE FÉRIAS</span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                    Dias de Férias a Reservar
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 5"
                    value={reserveFeriasDias}
                    onChange={(e) => setReserveFeriasDias(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                    Valor Médio Ganho por Dia (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 120.00"
                    value={reserveFeriasValorDiario}
                    onChange={(e) => setReserveFeriasValorDiario(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setReserveFeriasValorDiario(appAvgDailyEarnings.toFixed(2))}
                    className="mt-1 text-[9px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer truncate block max-w-full"
                    title={`Média diária real do app baseada nos registros salvos`}
                  >
                     Usar média do app: R$ {appAvgDailyEarnings.toFixed(2)}
                  </button>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CÁLCULO AUTOMÁTICO FÉRIAS</span>
                  <div className="mt-1 space-y-1 font-mono text-[11px] text-slate-700 font-semibold">
                    <div>Fundo Férias Total: <b className="text-slate-900">R$ {parseFloat(reserveFeriasDias) && parseFloat(reserveFeriasValorDiario) ? (parseInt(reserveFeriasDias) * parseFloat(reserveFeriasValorDiario)).toFixed(2) : '0.00'}</b></div>
                    <div>Por Mês ({monthsRemaining} meses): <b className="text-slate-900 font-medium">R$ {parseFloat(reserveFeriasDias) && parseFloat(reserveFeriasValorDiario) ? ((parseInt(reserveFeriasDias) * parseFloat(reserveFeriasValorDiario)) / monthsRemaining).toFixed(2) : '0.00'}</b></div>
                    <div>Soma na Meta Diária: <b className="text-blue-750 font-bold bg-blue-500/5 border border-blue-500/10 px-1 py-0.2 rounded-md">+ R$ {parseFloat(reserveFeriasDias) && parseFloat(reserveFeriasValorDiario) ? (((parseInt(reserveFeriasDias) * parseFloat(reserveFeriasValorDiario)) / monthsRemaining) / 30).toFixed(2) : '0.00'} / dia</b></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.99] hover:shadow-lg hover:shadow-amber-500/10 text-white font-extrabold text-sm py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            💾 SALVAR CONFIGURAÇÃO DE RESERVAS ANUAIS
          </button>
        </form>
      </div>

      {/* SECTION: DAY STATUS CALENDAR AND TARGET AUTORECALCULATE CONFIGS */}
      {(() => {
        // Math for calendar summary
        const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
        const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const monthsRemaining = Math.max(1, 12 - (currentMonth + 1) + 1);

        const decimoTotal = state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00;
        const decimoMensal = decimoTotal / monthsRemaining;
        const decimoDaily = decimoMensal / 30;

        const feriasDiasCount = state.feriasDias !== undefined ? state.feriasDias : 5;
        const feriasValDiario = state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00;
        const feriasTotalVal = feriasDiasCount * feriasValDiario;
        const feriasMensalVal = feriasTotalVal / monthsRemaining;
        const feriasDailyVal = feriasMensalVal / 30;

        // Meta Total includes expenses + extra goals + vacation + 13th salary for the remaining months
        const metaTotal = totalDespesas + totalObjetivosExtras + (decimoMensal * monthsRemaining) + (feriasMensalVal * monthsRemaining);

        const baseDailyTarget = totalDespesas / 30;
        const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
          return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
        }, 0);
        
        // Unadjusted total daily target including reserves
        const totalDailyTargetOriginal = baseDailyTarget + extraDailyTarget + decimoDaily + feriasDailyVal;

        const currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(currentMonthStr));
        const offDaysCount = currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta').length;
        const workDaysCount = Math.max(1, 30 - offDaysCount);

        // Adjusted daily target including reserves
        let targetPerUsefulDay = totalDailyTargetOriginal;
        let diffMultiplier = 1;
        if (!state.keepOriginalGoalToggle) {
          if (state.targetDivisionMode === 'concentrate') {
            diffMultiplier = (30 / workDaysCount) * 1.25;
          } else {
            diffMultiplier = 30 / workDaysCount;
          }
          targetPerUsefulDay = totalDailyTargetOriginal * diffMultiplier;
        }

        const decimoDailyAdjusted = decimoDaily * diffMultiplier;
        const feriasDailyAdjusted = feriasDailyVal * diffMultiplier;
        const baseDailyAdjusted = (baseDailyTarget + extraDailyTarget) * diffMultiplier;

        return (
          <div id="target_recalculate_settings" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <CalendarClock size={20} className="text-brand-500" />
              <h2 className="font-bold text-slate-850 text-base">Agenda & Ajuste Automático de Meta</h2>
            </div>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              Para garantir que seus descansos programados (<b>Folgas</b>) ou dias que não pôde trabalhar (<b>Faltas</b>) não comprometam suas finanças, o app redistribui o saldo das suas metas mensais apenas nos dias úteis reais que restam para você trabalhar.
            </p>

            {/* 1. BUTTON TO MANAGE THE CALENDAR */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-orange-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">Configuração de Calendário</span>
                <h3 className="font-bold text-slate-800 text-sm mt-0.5">Marcar Folgas e Faltas do Mês</h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md">Abra o calendário para marcar seus dias de repouso ou falta e ajustar o saldo restante.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-brand-500/10 transition-all flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-center"
              >
                <Calendar size={14} /> 📅 Marcar Dia do Mês
              </button>
            </div>

            {/* 2. SUMMARY DATA REQUESTED BY USER */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Dias Totais</span>
                <span className="text-lg font-black text-slate-850 block mt-1">30</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Folga / Falta</span>
                <span className="text-lg font-black text-amber-600 block mt-1">{offDaysCount}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Vou Trabalhar</span>
                <span className="text-lg font-black text-emerald-600 block mt-1">{workDaysCount}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Meta Total c/ Reservas</span>
                <span className="text-xs font-black text-slate-900 block mt-2 truncate" title={`R$ ${metaTotal.toFixed(2)}`}>
                  R$ {metaTotal.toFixed(2)}
                </span>
              </div>

              <div className="col-span-2 md:col-span-1 bg-brand-500/5 p-3 rounded-xl border border-brand-500/10 min-w-0">
                <span className="text-[10px] font-black text-brand-700 uppercase block truncate">Meta / Dia Útil</span>
                <span className="text-sm font-black text-brand-600 block mt-1.5 truncate" title={`R$ ${targetPerUsefulDay.toFixed(2)}`}>
                  R$ {targetPerUsefulDay.toFixed(2)}
                </span>
              </div>
            </div>

            {/* RESERVES CONFIRMATION BLUEPRINT BOX */}
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-150 space-y-2.5">
              <span className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <PiggyBank size={14} className="text-indigo-600" /> Detalhamento das Reservas na Confirmação da Meta
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Sua meta diária original final de <strong className="text-slate-700">R$ {totalDailyTargetOriginal.toFixed(2)}/dia</strong> é a soma da sua base operacional com as suas reservas CLT autopreparadas:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metas de Custeio Fixo e Extras</div>
                  <div className="flex justify-between font-bold text-slate-750">
                    <span>Meta de despesas:</span>
                    <span>R$ {baseDailyTarget.toFixed(2)}/dia</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-750">
                    <span>Objetivos Extras:</span>
                    <span>R$ {extraDailyTarget.toFixed(2)}/dia</span>
                  </div>
                </div>

                <div className="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                  <div className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Acréscimo de Reservas CLT</div>
                  <div className="flex justify-between font-bold text-blue-800">
                    <span>Proporcional 13º Salário:</span>
                    <span>+ R$ {decimoDaily.toFixed(2)}/dia</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-800">
                    <span>Proporcional Férias:</span>
                    <span>+ R$ {feriasDailyVal.toFixed(2)}/dia</span>
                  </div>
                </div>
              </div>

              {!state.keepOriginalGoalToggle && offDaysCount > 0 && (
                <div className="pt-2 border-t border-dashed border-slate-200">
                  <div className="bg-amber-500/5 text-amber-900 px-3 py-2 rounded-xl text-[11px] border border-amber-500/10 flex flex-col gap-1 font-medium">
                    <span className="font-extrabold flex items-center gap-1">⚡ CALENDÁRIO ATIVO: Incremento Ajustado por Folgas ({offDaysCount} dias de repouso)</span>
                    <p className="leading-relaxed opacity-90">
                      Como você registrou dias de folga/falta, a meta diária foi recalculada de <span className="font-bold">R$ {totalDailyTargetOriginal.toFixed(2)}</span> para <strong className="font-extrabold text-amber-600">R$ {targetPerUsefulDay.toFixed(2)} / dia útil</strong>.
                    </p>
                    <div className="font-mono text-[10px] text-slate-650 mt-1 grid grid-cols-3 gap-2">
                      <div>Base + Extras útil: <strong>R$ {baseDailyAdjusted.toFixed(2)}</strong></div>
                      <div>13º útil: <strong className="text-blue-700">R$ {decimoDailyAdjusted.toFixed(2)}</strong></div>
                      <div>Férias útil: <strong className="text-amber-700">R$ {feriasDailyAdjusted.toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. EXTRA CONFIGURATIONS */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-2.5">
                <div className="flex items-center h-5">
                  <input
                    id="keep_original_toggle"
                    type="checkbox"
                    checked={state.keepOriginalGoalToggle || false}
                    onChange={(e) => toggleKeepOriginalGoal(e.target.checked)}
                    className="h-4 w-4 rounded-xs border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </div>
                <div className="text-xs">
                  <label htmlFor="keep_original_toggle" className="font-bold text-slate-800 cursor-pointer select-none">
                    Manter meta original se quiser (Desativar ajuste automático de meta)
                  </label>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">Se ativado, o app vai ignorar as folgas/faltas registradas e manter o rateio padrão dividido sempre por 30 dias.</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-bold text-slate-700">
                  Estratégia de Distribuição de Folgas:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={state.keepOriginalGoalToggle}
                    onClick={() => updateTargetDivisionMode('equal')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${state.keepOriginalGoalToggle ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : state.targetDivisionMode === 'equal' || !state.targetDivisionMode ? 'bg-brand-50 border-brand-400 text-brand-900 ring-2 ring-brand-500/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${state.targetDivisionMode === 'equal' || !state.targetDivisionMode ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {(state.targetDivisionMode === 'equal' || !state.targetDivisionMode) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="font-bold text-xs text-slate-900">Dividir folga igualmente</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 pb-0.5 leading-relaxed">Divide o montante por igual sobre todos os dias úteis restantes no mês.</p>
                  </button>

                  <button
                    type="button"
                    disabled={state.keepOriginalGoalToggle}
                    onClick={() => updateTargetDivisionMode('concentrate')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${state.keepOriginalGoalToggle ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200' : state.targetDivisionMode === 'concentrate' ? 'bg-brand-50 border-brand-400 text-brand-900 ring-2 ring-brand-500/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${state.targetDivisionMode === 'concentrate' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {state.targetDivisionMode === 'concentrate' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="font-bold text-xs text-slate-900">Concentrar nos primeiros dias</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 pb-0.5 leading-relaxed">Adiciona um multiplicador temporário (25% extra) para garantir fundos antecipados.</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION: WIDGET DE TELA INICIAL SETTINGS AND CONTROLS */}
      <div id="widget_settings_controls" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Smartphone size={20} className="text-brand-500" />
          <h2 className="font-bold text-slate-850 text-base">🔘 Widget da Tela Inicial</h2>
        </div>

        <p className="text-slate-500 text-xs leading-relaxed">
          Configure a aparência do seu widget Android. O widget exibe informações atualizadas em tempo real a cada 5 minutos diretamente no plano de fundo do celular.
        </p>

        {/* 1. BUTTON TO MANUALLY TRIGGER UPDATE NOW */}
        <div className="bg-gradient-to-br from-orange-50 to-brand-50/10 border border-orange-100/60 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-xs uppercase text-brand-600 tracking-wider font-display">Ação Rápida</h3>
            <h4 className="font-bold text-slate-900 text-sm mt-0.5 font-display">Sincronização Manual do Widget</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm font-sans">Forçar a transmissão imediata dos dados do app para o widget de plano de fundo do celular.</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setIsUpdatingWidgetInSettings(true);
                transmitWidgetData(state);
                setTimeout(() => {
                  setIsUpdatingWidgetInSettings(false);
                  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  setWidgetSyncTimeStr(`Transmissão de dados realizada às ${nowStr}!`);
                }, 900);
              }}
              disabled={isUpdatingWidgetInSettings}
              className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-brand-500/10 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <RefreshCw size={14} className={isUpdatingWidgetInSettings ? 'animate-spin' : ''} />
              <span>🔘 {isUpdatingWidgetInSettings ? 'Transmitindo...' : 'Atualizar Widget Agora'}</span>
            </button>
            {widgetSyncTimeStr && (
              <span className="text-[10px] text-emerald-650 font-bold mt-1.5 animate-pulse text-right block font-display">
                ✓ {widgetSyncTimeStr}
              </span>
            )}
          </div>
        </div>

        {/* 2. CHOOSE WHAT DATA IS SHOWN IN THE WIDGET */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 font-display">
            🔘 Escolher o que exibir no Widget:
          </label>
          <p className="text-[10.5px] text-slate-400">Ative ou desative campos para otimizar sua visualização compacta na grade 4x2:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {[
              { key: 'showMeta', label: 'Meta de Hoje (R$)', desc: 'Exibe a meta ajustada de faturamento mensal distribuído.' },
              { key: 'showGanhos', label: 'Ganhos de Hoje (R$)', desc: 'Total ganho hoje somando entregas iFood e Quita.' },
              { key: 'showKm', label: 'Distância Percorrida (KM)', desc: 'Quilometragem acumulada em corridas de hoje.' },
              { key: 'showTempo', label: 'Tempo de Trabalho', desc: 'Duração da jornada de corridas ativa hoje.' },
              { key: 'showStatus', label: 'Status de Pilotagem', desc: 'Indica se está Ativo, Em Corrida ou Parado.' },
            ].map((field) => {
              const optionActive = state.widgetOptions?.[field.key as 'showMeta' | 'showGanhos' | 'showKm' | 'showTempo' | 'showStatus'] !== false;
              return (
                <button
                  type="button"
                  key={field.key}
                  onClick={() => {
                    updateWidgetOptions({
                      [field.key]: !optionActive
                    });
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${optionActive ? 'bg-brand-500/5 hover:bg-brand-500/[0.08] border-brand-400 text-slate-800' : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-500'}`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${optionActive ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-slate-300'}`}>
                    {optionActive && <span className="text-[10px] font-black">✓</span>}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate font-display">{field.label}</span>
                    <p className="text-[10px] text-slate-500 mt-1 pb-0.5 leading-snug">{field.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: MANAGE AND EDIT EXPENSES INLINE */}
      <div id="expenses_manager" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Calendar size={20} className="text-brand-500" />
          <h2 className="font-bold text-slate-850 text-base">Modificar / Excluir Despesas Cadastradas</h2>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Aqui você pode alterar valores, datas de vencimento de qualquer despesa (incluindo as iniciais pré-configuradas) ou simplesmente deletá-las.
        </p>

        <div className="space-y-3">
          {state.expenses.map((expense) => {
            const isEditingThis = editingExpenseId === expense.id;
            return (
              <div
                key={expense.id}
                className={`p-4 rounded-2xl border transition-all ${isEditingThis ? 'bg-orange-50/40 border-brand-300 shadow-xs' : 'bg-slate-50 border-slate-100'}`}
              >
                {isEditingThis ? (
                  // Inline editing inputs
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                        <input
                          type="text"
                          value={editExpName}
                          onChange={(e) => setEditExpName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editExpValue}
                          onChange={(e) => setEditExpValue(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Dia Vencimento</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editExpDueDate}
                          onChange={(e) => setEditExpDueDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={cancelEditExpense}
                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveExpense(expense.id)}
                        className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display line
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 truncate" title={expense.name}>{expense.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>Valor: <b className="text-slate-800">R$ {expense.value.toFixed(2)}</b></span>
                        <span className="text-slate-300 hidden xs:inline">|</span>
                        <span>Vence no dia: <b className="text-slate-800">{expense.dueDate}</b></span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 self-end sm:self-auto shrink-0 mt-1 sm:mt-0">
                      <button
                        onClick={() => startEditExpense(expense)}
                        className="bg-white hover:bg-brand-50 text-slate-600 border border-slate-200 hover:border-brand-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg cursor-pointer transition-all border border-transparent hover:border-red-200 flex items-center justify-center"
                        title="Excluir despesa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: TRANSACTION LOG & BULK CLEAN UP */}
      <div id="full_deliveries_log" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-slate-700" />
            <h2 className="font-bold text-slate-850 text-base">Registros de Corridas Gravados ({state.deliveries.length})</h2>
          </div>
          {state.deliveries.length > 0 && (
            <span className="text-xs text-slate-400">Total acumulado: R$ {state.deliveries.reduce((s,d)=>s+d.value,0).toFixed(2)}</span>
          )}
        </div>

        {state.deliveries.length === 0 ? (
          <div className="text-slate-400 text-xs text-center py-6">Nenhum registro de corrida salvo no momento.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {state.deliveries.map((delivery) => {
              const formattedDate = new Date(delivery.timestamp).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={delivery.id}
                  className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2 sm:p-2.5 rounded-xl hover:bg-slate-100/40 transition-colors gap-2 min-w-0"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md shrink-0 ${delivery.type === 'ifood' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'}`}>
                      {delivery.type}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-500 truncate">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-800 font-mono">
                      R$ {delivery.value.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteDelivery(delivery.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center p-1"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: NOTIFICAÇÕES E ALERTAS DE METAS */}
      <div id="notifications_settings_block" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Bell size={20} className="text-brand-500" />
          <h2 className="font-bold text-slate-850 text-base">🔔 ALERTAS E NOTIFICAÇÕES</h2>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Ative as notificações push e alertas de sistema para receber avisos imediatos no seu celular ao bater a sua meta diária de ganhos ou quando a manutenção da bicicleta estiver próxima!
        </p>

        {!notifSupported ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
            ⚠️ Atenção: Notificações nativas não são suportadas neste navegador/sistema. Use o Google Chrome para obter suporte completo.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between bg-slate-50/50 border border-slate-105 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Status da Permissão</span>
                <span className={`text-xs font-bold ${
                  notifPermission === 'granted' ? 'text-emerald-600' : notifPermission === 'denied' ? 'text-red-500' : 'text-amber-500'
                }`}>
                  {notifPermission === 'granted' ? '🟢 PERMITIDO (Ativo)' : notifPermission === 'denied' ? '🔴 NEGADO' : '🟡 NÃO SOLICITADO'}
                </span>
              </div>
              
              {notifPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotifPermission}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Permitir Alertas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="border border-slate-100 p-4 rounded-2xl space-y-2 bg-slate-50/30">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Meta Diária
                </div>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Envia um aviso vibratório instantâneo assim que o valor total de entregas lançadas hoje atingir ou superar a meta diária calculada.
                </p>
              </div>

              <div className="border border-slate-100 p-4 rounded-2xl space-y-2 bg-slate-50/30">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle size={14} className="text-orange-500" /> Limite de Manutenção
                </div>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Alerta no celular no momento em que você ultrapassar a kilometragem de rodagem recomendada pré-estabelecida no painel de percurso.
                </p>
              </div>
            </div>

            {notifPermission === 'granted' && (
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isTestingNotif}
                className="w-full border shadow-xs border-slate-200 hover:bg-slate-50 text-slate-705 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing size={14} className={isTestingNotif ? 'animate-bounce' : ''} />
                {isTestingNotif ? 'Enviando Alerta...' : '📲 Testar Notificação de Alerta Real'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: AUTOMATED CELLPHONE INSTALLATION */}
      <div id="installation_direct_access" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Smartphone size={20} className="text-orange-500" />
          <h2 className="font-bold text-slate-850 text-base">📲 INSTALAÇÃO E ATUALIZAÇÃO</h2>
        </div>
        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-slate-800 text-sm">
            Para instalar ou atualizar, abra esse link no Google Chrome:
          </p>
          <div className="bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
            <span className="font-mono text-sm text-slate-700 select-all">https://controle-pro.vercel.app</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Recomendado</span>
          </div>
          <div className="text-slate-655 text-xs space-y-2 pt-1 font-medium">
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">→</span>
              <span>Clique nos 3 pontinhos <strong className="font-bold">⋮</strong> no canto superior direito</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">→</span>
              <span>Escolha: <strong className="font-bold">"Instalar aplicativo"</strong> ou <strong className="font-bold">"Adicionar à tela inicial"</strong></span>
            </div>
          </div>
          <div className="pt-2 border-t border-orange-100 flex items-center gap-1.5 text-emerald-850 font-semibold text-xs">
            <span>✅ Pronto! O ícone aparecerá na tela.</span>
          </div>
        </div>
      </div>

      {/* FACTORY RESET BANNER */}
      <div id="factory_reset_panel" className="bg-red-50/70 border border-red-100 rounded-3xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="font-bold text-red-800 text-sm">Área Crítica - Reiniciar Aplicativo</h3>
            <p className="text-slate-600 text-xs leading-relaxed mt-1">
              Caso queira recomeçar o mês ou limpar todos os seus registros de teste, você pode redefinir o banco de dados. Isso removerá todas as entregas completas, reativará os valores unitários originais de R$ 7,00 e recuperará as 4 despesas básicas padrão.
            </p>
          </div>
        </div>

        <button
          id="btn_factory_reset"
          onClick={handleWipeDatabase}
          className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer py-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={14} /> Limpar Tudo e Redefinir para Originais
        </button>
      </div>

      {/* Dynamic installation overlay modal */}
      {showAutoPromptOverlay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-150 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 animate-bounce">
              <Smartphone size={32} />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-950 text-base">Instalar Aplicativo Oficial</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Clique no botão abaixo para confirmar a criação do atalho e fixar o ícone oficial na sua Tela de Início!
              </p>
            </div>
            <button
              onClick={handleTriggerAutoPrompt}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95"
            >
              📲 INSTALAR AGORA MESMO
            </button>
            <button 
              onClick={() => setShowAutoPromptOverlay(false)} 
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer block mx-auto pt-1"
            >
              Desistir
            </button>
          </div>
        </div>
      )}

      {/* Connection retry helper loading state */}
      {isWaitingPrompt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <div className="flex justify-center">
              <span className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin block" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Iniciando Instalador do Celular</h3>
              <p className="text-slate-500 text-[11px] mt-1">Conectando ao sistema nativo do seu Android para exibir a confirmação na hora...</p>
            </div>
          </div>
        </div>
      )}

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        dayRegistrations={state.dayRegistrations || []}
        onUpdateDayStatus={updateDayStatus}
      />

    </div>
  );
}
