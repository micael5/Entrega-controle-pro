/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Trash2, Calendar, DollarSign, RefreshCw, AlertTriangle, Plus, CheckCircle2, ChevronRight, Smartphone, Chrome, CalendarClock, Coffee, AlertCircle } from 'lucide-react';
import { AppState, Expense, ExtraGoal } from '../types';
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
  updateWidgetOptions
}: SettingsViewProps) {
  // Config state
  const [ifoodRate, setIfoodRate] = useState(state.config.ifoodValue.toString());
  const [quitaRate, setQuitaRate] = useState(state.config.quitaValue.toString());
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
      setActionSuccess('📲 Abrindo em uma nova aba segura externa para acionar a janela de instalação automática do Android imediatamente!');
      return;
    }

    // Busca o evento capturado
    let promptEvent = deferredPrompt || (window as any).deferredPrompt;

    // Se o evento ainda não estiver disponível, tenta aguardar até 1.5 segundos
    if (!promptEvent) {
      setIsWaitingPrompt(true);
      const waitForPrompt = () => {
        return new Promise<any>((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            const current = (window as any).deferredPrompt;
            if (current) {
              clearInterval(interval);
              resolve(current);
            }
            attempts++;
            if (attempts >= 8) { // 1.6 segundos
              clearInterval(interval);
              resolve(null);
            }
          }, 200);
        });
      };
      promptEvent = await waitForPrompt();
      setIsWaitingPrompt(false);
    }

    if (promptEvent) {
      try {
        // Dispara o comando real do sistema do celular
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setActionSuccess('📲 Excelente! O ícone "EntregaControle Pro" foi adicionado com sucesso à sua Tela de Início!');
        } else {
          setActionSuccess('Instalação cancelada pelo usuário.');
        }
      } catch (err) {
        console.warn('Erro ao acionar prompt nativo:', err);
        setActionError('Não foi possível acionar a instalação automática do sistema.');
      }
      // Limpa os prompts capturados para reutilização futura
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    } else {
      // Se nem o delay funcionou (pode ocorrer se o navegador já tiver instalado o PWA ou estiver em modo desktop sem suporte)
      setActionError('O navegador demorou para responder. Caso já não esteja instalado, use os Três Pontinhos (⋮) do Chrome > "Adicionar à tela de início".');
    }
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

      {/* SECTION: DAY STATUS CALENDAR AND TARGET AUTORECALCULATE CONFIGS */}
      {(() => {
        // Math for calendar summary
        const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
        const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
        const metaTotal = totalDespesas + totalObjetivosExtras;

        const baseDailyTarget = totalDespesas / 30;
        const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
          return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
        }, 0);
        const totalDailyTargetOriginal = baseDailyTarget + extraDailyTarget;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        const currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(currentMonthStr));
        const offDaysCount = currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta').length;
        const workDaysCount = Math.max(1, 30 - offDaysCount);

        // Adjusted daily target
        let targetPerUsefulDay = totalDailyTargetOriginal;
        if (!state.keepOriginalGoalToggle) {
          if (state.targetDivisionMode === 'concentrate') {
            targetPerUsefulDay = (totalDailyTargetOriginal * 30 / workDaysCount) * 1.25;
          } else {
            targetPerUsefulDay = totalDailyTargetOriginal * 30 / workDaysCount;
          }
        }

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
                <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Meta Total</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-2 truncate" title={`R$ ${metaTotal.toFixed(2)}`}>
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

      {/* SECTION 4: AUTOMATED CELLPHONE INSTALLATION & DIRECT CHROME LAUNCH */}
      <div id="installation_direct_access" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <Smartphone size={20} className="text-brand-500" />
          <h2 className="font-bold text-slate-850 text-base">Instalação e Acesso Direto</h2>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Instale o aplicativo diretamente em seu celular ou execute em uma janela limpa, sem as telas de desenvolvimento do Google AI Studio.
        </p>

        <div className="grid grid-cols-1 gap-4">
          
          {/* Action 1: Abrir Aplicativo Direto no Chrome (Top) */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                Acesso Direto pelo Chrome
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-1">
                Abra instantaneamente o aplicativo no navegador Google Chrome como uma aplicação independente e pronta para uso profissional.
              </p>
            </div>
            
            <button
              onClick={handleOpenDirectChrome}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/10"
            >
              <Chrome size={14} /> Abrir Aplicativo Direto no Chrome
            </button>
          </div>

          {/* Action 2: Instalar / Atualizar Automaticamente no Celular (Below) */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                Instalação Automática no Celular
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-1">
                Gera e instala o aplicativo nativo completo no seu celular, com todas as funções e banco de dados, pronto para usar fora do navegador.
              </p>
            </div>
            
            <button
              onClick={handleAutoReinstall}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/10"
            >
              <Smartphone size={14} /> 📲 Instalar / Atualizar Aplicativo Completo
            </button>
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
