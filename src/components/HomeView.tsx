/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Sparkles, TrendingUp, DollarSign, Receipt, HelpCircle, CheckCircle, Flame, CalendarClock, Calendar, Smartphone, RefreshCw, Sliders, Clock, MapPin, Activity, Wifi, PiggyBank } from 'lucide-react';
import { AppState } from '../types';
import { CalendarModal } from './CalendarModal';

interface HomeViewProps {
  state: AppState;
  addDelivery: (type: 'ifood' | 'quita') => void;
  deleteDelivery: (id: string) => void;
  updateDayStatus: (date: string, status: 'trabalho' | 'folga' | 'falta') => void;
  updateTargetDivisionMode: (mode: 'equal' | 'concentrate') => void;
  toggleKeepOriginalGoal: (keep: boolean) => void;
  updateWidgetOptions: (options: AppState['widgetOptions']) => void;
  depositReserves: (decimoAmount: number, feriasAmount: number, description: string) => void;
  adjustReserveBalance: (category: '13th' | 'vacation', amount: number, type: 'deposit' | 'withdraw', description: string) => void;
  resetReserveBalance: (category: '13th' | 'vacation') => void;
}

export function HomeView({
  state,
  addDelivery,
  deleteDelivery,
  updateDayStatus,
  updateTargetDivisionMode,
  toggleKeepOriginalGoal,
  updateWidgetOptions,
  depositReserves,
  adjustReserveBalance,
  resetReserveBalance
}: HomeViewProps) {
  const [lastRegistered, setLastRegistered] = useState<{ id: string; text: string } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // States for Quick Reserve transaction form
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(false);
  const [quickAdjustCategory, setQuickAdjustCategory] = useState<'13th' | 'vacation'>('13th');
  const [quickAdjustType, setQuickAdjustType] = useState<'deposit' | 'withdraw'>('deposit');
  const [quickAdjustValue, setQuickAdjustValue] = useState('');
  const [quickAdjustDesc, setQuickAdjustDesc] = useState('');
  const [quickAdjustFeedback, setQuickAdjustFeedback] = useState('');
  const [quickAdjustError, setQuickAdjustError] = useState('');

  const handleQuickAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAdjustError('');
    setQuickAdjustFeedback('');

    const val = parseFloat(quickAdjustValue);
    if (isNaN(val) || val <= 0) {
      setQuickAdjustError('Informe um valor de moeda válido maior que zero (Ex: 50.00).');
      return;
    }

    if (!quickAdjustDesc.trim()) {
      setQuickAdjustError('Informe um breve motivo ou descrição da transação.');
      return;
    }

    adjustReserveBalance(quickAdjustCategory, val, quickAdjustType, quickAdjustDesc.trim());
    setQuickAdjustFeedback(`🚀 Transação de R$ ${val.toFixed(2)} efetuada com sucesso!`);
    setQuickAdjustValue('');
    setQuickAdjustDesc('');
    setTimeout(() => setQuickAdjustFeedback(''), 4500);
  };

  // Math conversions
  const totalGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
  const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
  
  // Total target includes expenses + all extra goals total target values
  const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
  
  // Combine 13th + Holiday totals into total reserves to save (proportional until Dec)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const monthsRemaining = Math.max(1, 12 - (currentMonth + 1) + 1);

  const decimoTerceiroTotal = state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00;
  const decimoTerceiroMensal = decimoTerceiroTotal / monthsRemaining;
  const decimoTerceiroUnadjustedDaily = decimoTerceiroMensal / 30;

  const feriasDias = state.feriasDias !== undefined ? state.feriasDias : 5;
  const feriasValorDiario = state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00;
  const feriasTotal = feriasDias * feriasValorDiario;
  const feriasMensal = feriasTotal / monthsRemaining;
  const feriasUnadjustedDaily = feriasMensal / 30;

  const metaTotal = totalDespesas + totalObjetivosExtras + (decimoTerceiroMensal * monthsRemaining) + (feriasMensal * monthsRemaining);

  const restandoParaMeta = Math.max(0, metaTotal - totalGanhos);
  const sobrouIdeal = totalGanhos > metaTotal ? totalGanhos - metaTotal : 0;
  const progressoPercent = metaTotal > 0 ? Math.min(100, (totalGanhos / metaTotal) * 100) : 0;

  // Daily target calculations matching MetaView.tsx
  const baseDailyTarget = totalDespesas / 30;
  const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
    return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
  }, 0);
  const totalDailyTarget = baseDailyTarget + extraDailyTarget + decimoTerceiroUnadjustedDaily + feriasUnadjustedDaily;

  // Day-adjusted daily target recalculations for off/absence days
  const currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(currentMonthStr));
  const offDays = currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta');
  const numOffDays = offDays.length;
  const numWorkDays = Math.max(1, 30 - numOffDays);

  const todayStrDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayReg = (state.dayRegistrations || []).find(reg => reg.date === todayStrDate);
  const todayStatus = todayReg ? todayReg.status : 'trabalho';
  const isOffToday = todayStatus === 'folga' || todayStatus === 'falta';

  // Division strategy evaluation
  let adjustedDailyTargetForWorkingDays = totalDailyTarget;
  let adjustmentMultiplier = 1;
  if (!state.keepOriginalGoalToggle) {
    if (state.targetDivisionMode === 'concentrate') {
      adjustmentMultiplier = (30 / numWorkDays) * 1.25;
    } else {
      adjustmentMultiplier = 30 / numWorkDays;
    }
    adjustedDailyTargetForWorkingDays = totalDailyTarget * adjustmentMultiplier;
  }

  const decimoTerceiroDiarioAjustado = decimoTerceiroUnadjustedDaily * adjustmentMultiplier;
  const feriasDiarioAjustado = feriasUnadjustedDaily * adjustmentMultiplier;
  const baseDailyDiarioAjustado = (baseDailyTarget + extraDailyTarget) * adjustmentMultiplier;

  // Active target for today (if off/absence, we enforce 0 as requested, and sum any pending goal rollover)
  const pendingRollover = state.accumulatedGoalPendente || 0;
  const activeTodayTarget = isOffToday ? 0 : (adjustedDailyTargetForWorkingDays + pendingRollover);

  // Check if today has already been deposited automatically
  const alreadyDepositedToday = (state.annualReserveHistory || []).some(
    entry => entry.date === new Date().toLocaleDateString('pt-BR') && entry.description.includes("automático")
  );


  // Filter deliveries done today (current calendar day)
  const todayStr = new Date().toDateString();
  const hojeGanhos = state.deliveries
    .filter(del => {
      const d = new Date(del.timestamp);
      return d.toDateString() === todayStr;
    })
    .reduce((sum, del) => sum + del.value, 0);

  // Mileage stats from trips
  const trips = state.trips || [];
  const totalKmHoje = trips
    .filter((t) => new Date(t.date).toDateString() === todayStr)
    .reduce((sum, t) => sum + t.km, 0);

  // Filter this month's trips
  const tripsThisMonth = trips.filter((trip) => {
    const d = new Date(trip.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalKmMes = tripsThisMonth.reduce((sum, t) => sum + t.km, 0);

  // Recent deliveries logged
  const recentGanhos = [...state.deliveries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const handleRegister = (type: 'ifood' | 'quita') => {
    addDelivery(type);
    const value = type === 'ifood' ? state.config.ifoodValue : state.config.quitaValue;
    
    // Create standard visual notifier
    const id = Math.random().toString();
    setLastRegistered({
      id,
      text: `+R$ ${value.toFixed(2)} registrado de ganho no ${type === 'ifood' ? 'iFood' : 'Quita'}!`,
    });

    setTimeout(() => {
      setLastRegistered(prev => (prev?.id === id ? null : prev));
    }, 3000);
  };

  // Helper to format date
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="home_view_container" className="space-y-6">
      
      {/* Header welcome banner */}
      <div id="welcome_banner" className="bg-gradient-to-br from-brand-600 to-orange-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <Bike size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-white/20 text-orange-100 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
              Painel do Entregador
            </span>
            <h1 className="text-3xl font-bold font-display tracking-tight mt-2">
              EntregaControle <span className="text-amber-200">Pro</span>
            </h1>
          </div>
          <div className="text-left md:text-right shrink-0">
            <span className="text-xs text-orange-200 block">Status de Ganhos</span>
            <span className="text-3xl font-display font-bold text-amber-300 block">
              R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            
            {/* New daily target details requested by user */}
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <div className="flex md:justify-end items-center gap-2 text-xs text-orange-100 flex-wrap">
                <span className="opacity-80">Meta de hoje:</span>
                <span className="font-mono font-extrabold text-white bg-white/20 px-2 py-0.5 rounded-md text-xs">
                  R$ {activeTodayTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {isOffToday && (
                  <span className="bg-amber-400 text-slate-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wide animate-pulse shrink-0">
                    {todayStatus === 'folga' ? 'Folga' : 'Falta'}
                  </span>
                )}
              </div>

              {pendingRollover > 0 && !isOffToday && (
                <div className="flex md:justify-end items-center gap-1 text-[11px] text-amber-200 font-bold bg-white/10 border border-white/20 rounded-xl p-2 mt-1">
                  <span>⚠️ R$ {adjustedDailyTargetForWorkingDays.toFixed(2)} normal + R$ {pendingRollover.toFixed(2)} acumulados</span>
                </div>
              )}

              {/* Show Original vs Adjusted Targets if there are rest/absence days registered */}
              {numOffDays > 0 && !state.keepOriginalGoalToggle && (
                <div className="flex flex-col md:items-end text-[10.5px] text-orange-100 space-y-1 bg-black/15 p-2 px-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between md:justify-end items-center gap-4 w-full">
                    <span className="opacity-75">Meta Original:</span>
                    <span className="font-mono text-orange-200 line-through">
                      R$ {totalDailyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between md:justify-end items-center gap-4 w-full">
                    <span className="opacity-95 font-bold text-amber-200">Meta Ajustada (Dia Útil):</span>
                    <span className="font-mono text-white font-bold bg-white/15 px-1.5 py-0.5 rounded-sm">
                      R$ {adjustedDailyTargetForWorkingDays.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[9px] opacity-90 text-left md:text-right mt-0.5 text-orange-100 font-semibold italic leading-snug">
                    💡 Ajustado: {numOffDays} {numOffDays === 1 ? 'dia de folga/falta' : 'dias de folga/falta'} ({numWorkDays} dias úteis restantes)
                  </p>
                </div>
              )}

              <div className="flex md:justify-end items-center gap-2 text-xs text-orange-100 flex-wrap">
                {hojeGanhos >= activeTodayTarget ? (
                  <>
                    <span className="text-emerald-300 font-semibold">Valor que sobrou:</span>
                    <span className="font-mono font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      R$ {(hojeGanhos - activeTodayTarget).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-orange-200 opacity-95">Falta para meta:</span>
                    <span className="font-mono font-black text-amber-250 bg-amber-500/20 px-2 py-0.5 rounded-md">
                      R$ {(activeTodayTarget - hojeGanhos).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </>
                )}
              </div>

              <div className="flex md:justify-end items-center gap-2 text-xs text-orange-100 border-t border-white/10 pt-2 mt-2">
                <span className="opacity-80">KM percorridos hoje:</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                  {totalKmHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                </span>
              </div>

              <div className="flex md:justify-end items-center gap-2 text-xs text-orange-100">
                <span className="opacity-80">Total KM no mês:</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                  {totalKmMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 📊 ACOMPANHAMENTO DE RESERVAS ANUAIS */}
      {(() => {
        const decimoSaved = state.decimoTerceiroSaved || 0;
        const decimoTotal = state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00;
        const decimoPercent = decimoTotal > 0 ? (decimoSaved / decimoTotal) * 100 : 0;

        const feriasSaved = state.feriasSaved || 0;
        const feriasDiasCount = state.feriasDias !== undefined ? state.feriasDias : 5;
        const feriasDiarioVal = state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00;
        const feriasTotalVal = feriasDiasCount * feriasDiarioVal;
        const feriasPercent = feriasTotalVal > 0 ? (feriasSaved / feriasTotalVal) * 100 : 0;

        const getProgressBlocks = (percent: number, activeBlock: string, emptyBlock: string) => {
          const totalSlots = 8;
          const activeSlots = Math.min(totalSlots, Math.round((percent / 100) * totalSlots));
          const emptySlots = totalSlots - activeSlots;
          return activeBlock.repeat(activeSlots) + emptyBlock.repeat(emptySlots);
        };

        return (
          <div id="annual_reserves_progress_home" className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-50/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-display">ACOMPANHAMENTO DE RESERVAS ANUAIS</h3>
              </div>
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Acúmulo Proporcional
              </span>
            </div>

            <div className="space-y-4">
              {/* BARRA 1 — DÉCIMO TERCEIRO */}
              <div id="res_progress_decimo" className="space-y-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm font-bold text-slate-800 gap-1">
                  <span className="text-blue-700 flex items-center gap-1.5 font-extrabold">
                    🔵 BARRA 1 — DÉCIMO TERCEIRO
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    Guardado: <b className="text-blue-700 text-xs text-slate-800 font-extrabold">R$ {decimoSaved.toFixed(2)}</b> | Total: R$ {decimoTotal.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[15px] sm:text-lg tracking-wider font-mono select-none shrink-0" title={`${decimoPercent.toFixed(1)}%`}>
                    {getProgressBlocks(decimoPercent, '🟦', '⬜')}
                  </span>
                  <span className="font-mono font-extrabold text-[#1d4ed8] text-[11px] sm:text-xs shrink-0 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {decimoPercent.toFixed(0)}% concluído
                  </span>
                  
                  <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden ml-1 hidden xs:block">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${decimoPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* BARRA 2 — FÉRIAS */}
              <div id="res_progress_ferias" className="space-y-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm font-bold text-slate-800 gap-1 col-span-2">
                  <span className="text-amber-600 flex items-center gap-1.5 font-extrabold">
                    💛 BARRA 2 — FÉRIAS
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    Guardado: <b className="text-amber-600 text-xs font-extrabold">R$ {feriasSaved.toFixed(2)}</b> | Total: R$ {feriasTotalVal.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[15px] sm:text-lg tracking-wider font-mono select-none shrink-0" title={`${feriasPercent.toFixed(1)}%`}>
                    {getProgressBlocks(feriasPercent, '🟨', '⬜')}
                  </span>
                  <span className="font-mono font-extrabold text-[#b45309] text-[11px] sm:text-xs shrink-0 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                    {feriasPercent.toFixed(0)}% concluído
                  </span>

                  <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden ml-1 hidden xs:block">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${feriasPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Deposits and Withdrawals */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustOpen(!quickAdjustOpen)}
                  className="text-xs font-bold text-brand-610 hover:text-brand-700 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  {quickAdjustOpen ? '✖ Fechar depósitos rápidos' : '📥 Lançamento de Reserva Manual Rápido (Guardar ou Sacar)...'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente zerar os valores guardados de ambas as reservas? Esta ação é permanente e gerará registros de retiradas.')) {
                      resetReserveBalance('13th');
                      resetReserveBalance('vacation');
                      alert('Os saldos do seu cofre foram zerados com êxito! Os dados foram enviados ao histórico.');
                    }
                  }}
                  className="text-[10px] font-black text-red-500 hover:text-red-700 font-mono tracking-wider select-none shrink-0 cursor-pointer"
                >
                  🔄 ZERAR COFRE
                </button>
              </div>

              {quickAdjustOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Depósito ou Retirada Manual de Valores</span>
                  
                  {quickAdjustFeedback && (
                    <div className="bg-emerald-50 text-emerald-850 p-2.5 rounded-xl text-xs font-bold border border-emerald-200">
                      {quickAdjustFeedback}
                    </div>
                  )}

                  {quickAdjustError && (
                    <div className="bg-red-50 text-red-650 p-2.5 rounded-xl text-xs font-semibold border border-red-205">
                      {quickAdjustError}
                    </div>
                  )}

                  <form onSubmit={handleQuickAdjustSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-405 uppercase tracking-wider mb-1">Cofre Alvo</label>
                        <select
                          value={quickAdjustCategory}
                          onChange={(e) => setQuickAdjustCategory(e.target.value as '13th' | 'vacation')}
                          className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium cursor-pointer"
                        >
                          <option value="13th">13º Salário</option>
                          <option value="vacation">Férias</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-405 uppercase tracking-wider mb-1">Operação</label>
                        <select
                          value={quickAdjustType}
                          onChange={(e) => setQuickAdjustType(e.target.value as 'deposit' | 'withdraw')}
                          className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium cursor-pointer"
                        >
                          <option value="deposit">📥 Depositar (+)</option>
                          <option value="withdraw">📤 Sacar / Retirar (–)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-405 uppercase tracking-wider mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={quickAdjustValue}
                          onChange={(e) => setQuickAdjustValue(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-405 uppercase tracking-wider mb-1">Motivo / Descrição</label>
                      <input
                        type="text"
                        placeholder="Ex: Depósito voluntário extra, Resgate de férias"
                        value={quickAdjustDesc}
                        onChange={(e) => setQuickAdjustDesc(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Confirmar Movimentação de Saldo
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        );
      })()}


      {/* Calendar toggle control */}
      <div id="home_calendar_indicator" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm shadow-brand-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-2xl border border-amber-100/50 shrink-0 mt-0.5">
            <Calendar size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold font-display text-slate-800 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
              <span>📅 Marcar Dia: Trabalho / Folga / Falta</span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-1 leading-relaxed max-w-md">
              {numOffDays > 0 ? (
                <>Você tem <b className="text-amber-600">{numOffDays} {numOffDays === 1 ? 'dia' : 'dias'}</b> de folga/falta neste mês. A sua meta ideal diária foi reajustada automaticamente.</>
              ) : (
                <>Altere os dias que você não vai trabalhar. O app redistribui a meta de ganhos nos dias restantes de forma inteligente.</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCalendarOpen(true)}
          className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-brand-500/15 shrink-0 self-end sm:self-center"
        >
          Minha Agenda
        </button>
      </div>

      {/* Floating feedback alert */}
      <AnimatePresence>
        {lastRegistered && (
          <motion.div
            id="last_registered_toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-600 text-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 border border-emerald-500/30"
          >
            <CheckCircle size={20} className="text-emerald-200 shrink-0" />
            <span className="font-medium text-sm">{lastRegistered.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOWING CELEBRATORY CARD FOR ANNUAL DEPOSITS */}
      {hojeGanhos >= activeTodayTarget && activeTodayTarget > 0 && !isOffToday && (
        <div id="reserves_celebration_card" className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 text-amber-500/10 pointer-events-none">
            <Sparkles size={110} />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider leading-none">
                Parabéns!
              </span>
              <h3 className="font-extrabold font-display text-amber-950 text-sm sm:text-md">
                🏆 Meta de Hoje Superada!
              </h3>
            </div>
            
            <p className="text-slate-700 text-xs leading-relaxed max-w-lg">
              Você bateu sua meta diária de <b>R$ {activeTodayTarget.toFixed(2)}</b> (acumulado hoje: <b>R$ {hojeGanhos.toFixed(2)}</b>). 
              Aproveite para guardar as parcelas de reserva de hoje no seu cofrinho anual separado:
            </p>

            <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border border-amber-200/50 grid grid-cols-2 gap-3 divide-x divide-amber-100">
              <div className="px-2">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">13º Salário Diário</span>
                <span className="text-sm font-black text-amber-600 block mt-0.5 font-mono">
                  +R$ {decimoTerceiroDiarioAjustado.toFixed(2)}
                </span>
              </div>
              <div className="px-4">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Férias ({state.feriasDias} dias)</span>
                <span className="text-sm font-black text-amber-600 block mt-0.5 font-mono">
                  +R$ {feriasDiarioAjustado.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-500">
                Total para depositar hoje: <strong className="text-amber-700 font-mono">R$ {(decimoTerceiroDiarioAjustado + feriasDiarioAjustado).toFixed(2)}</strong>
              </div>
              
              {alreadyDepositedToday ? (
                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-[11px] py-1.5 px-3.5 rounded-xl flex items-center gap-1">
                  <CheckCircle size={14} className="text-emerald-600" /> DEPOSITADO!
                </span>
              ) : (
                <button
                  onClick={() => {
                    depositReserves(
                      decimoTerceiroDiarioAjustado,
                      feriasDiarioAjustado,
                      `Depósito diário automático (Meta batida em ${new Date().toLocaleDateString('pt-BR')})`
                    );
                    const toastId = Math.random().toString();
                    setLastRegistered({
                      id: toastId,
                      text: `🎉 R$ ${(decimoTerceiroDiarioAjustado + feriasDiarioAjustado).toFixed(2)} guardados com sucesso nas Reservas!`
                    });
                    setTimeout(() => {
                      setLastRegistered(prev => (prev?.id === toastId ? null : prev));
                    }, 3000);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  💰 Guardar R$ {(decimoTerceiroDiarioAjustado + feriasDiarioAjustado).toFixed(2)} nas Reservas
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two giant side-by-side action buttons */}
      <div id="earnings_actions" className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* iFood Button */}
        <motion.button
          id="btn_gain_ifood"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleRegister('ifood')}
          className="bg-white border-2 border-brand-500 hover:border-brand-600 cursor-pointer rounded-2xl p-3 sm:p-5 text-left transition-colors duration-200 shadow-sm flex flex-col justify-between group min-h-[8.5rem] break-words"
        >
          <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-2">
            <div className="bg-red-50 text-red-600 px-2 py-1.5 rounded-xl group-hover:bg-red-100 transition-colors shrink-0">
              <span className="font-extrabold text-sm xs:text-base tracking-tighter">iFood</span>
            </div>
            <span className="text-brand-500 bg-brand-50 text-[10px] xs:text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0">
              Entrega +
            </span>
          </div>
          <div className="min-w-0 w-full mt-auto">
            <h2 className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none">Ganho iFood</h2>
            <div className="flex items-baseline gap-1 mt-1 min-w-0 w-full">
              <span className="text-base xs:text-lg sm:text-2xl font-bold font-display text-slate-900 truncate block">
                +R$ {state.config.ifoodValue.toFixed(2)}
              </span>
            </div>
            <span className="text-[9px] xs:text-[11px] text-slate-400 block mt-0.5 truncate">Registrar entrega</span>
          </div>
        </motion.button>

        {/* Quita Button */}
        <motion.button
          id="btn_gain_quita"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleRegister('quita')}
          className="bg-white border-2 border-teal-500 hover:border-teal-600 cursor-pointer rounded-2xl p-3 sm:p-5 text-left transition-colors duration-200 shadow-sm flex flex-col justify-between group min-h-[8.5rem] break-words"
        >
          <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-2">
            <div className="bg-teal-50 text-teal-600 px-2 py-1.5 rounded-xl group-hover:bg-teal-100 transition-colors shrink-0">
              <span className="font-extrabold text-sm xs:text-base tracking-tighter">Quita</span>
            </div>
            <span className="text-teal-500 bg-teal-50 text-[10px] xs:text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0">
              Entrega +
            </span>
          </div>
          <div className="min-w-0 w-full mt-auto">
            <h2 className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none">Ganho Quita</h2>
            <div className="flex items-baseline gap-1 mt-1 min-w-0 w-full">
              <span className="text-base xs:text-lg sm:text-2xl font-bold font-display text-slate-900 truncate block">
                +R$ {state.config.quitaValue.toFixed(2)}
              </span>
            </div>
            <span className="text-[9px] xs:text-[11px] text-slate-400 block mt-0.5 truncate">Registrar entrega</span>
          </div>
        </motion.button>
      </div>

      {/* CORE FINANCIAL METRICS */}
      <div id="financial_metrics_core" className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100">
        <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-brand-500" />
          Metas & Progresso Mensal
        </h2>

        {/* Progress gauge bar */}
        <div className="space-y-2 mb-6">
          <div className="flex flex-wrap justify-between items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-medium text-slate-500">Progresso geral da meta</span>
            <span className="font-mono text-xs sm:text-sm font-semibold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
              {progressoPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressoPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full"
            />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 gap-1 flex-wrap">
            <span className="truncate">R$ {totalGanhos.toFixed(2)} ganhos</span>
            <span className="truncate">Meta: R$ {metaTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* 4 grid values summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* Card 1: Meta do Mês */}
          <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
              <span className="text-[11px] sm:text-xs font-semibold truncate">Meta do Mês</span>
              <CalendarClock size={16} className="text-slate-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold font-display text-slate-900 block truncate" title={`R$ ${metaTotal.toFixed(2)}`}>
                R$ {metaTotal.toFixed(2)}
              </span>
              <span className="text-[9px] xs:text-[10px] text-slate-400 block mt-1 truncate">Despesas + Objetivos</span>
            </div>
          </div>

          {/* Card 2: Já Ganho */}
          <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
              <span className="text-[11px] sm:text-xs font-semibold truncate">Ganhos Reais</span>
              <DollarSign size={16} className="text-brand-500 shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold font-display text-emerald-600 block truncate" title={`R$ ${totalGanhos.toFixed(2)}`}>
                R$ {totalGanhos.toFixed(2)}
              </span>
              <span className="text-[9px] xs:text-[10px] text-slate-400 block mt-1 truncate">{state.deliveries.length} entregas</span>
            </div>
          </div>

          {/* Card 3: Total Despesas */}
          <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between text-slate-400 mb-2 gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Despesas Totais</span>
              <Receipt size={16} className="text-red-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold font-display text-slate-800 block truncate" title={`R$ ${totalDespesas.toFixed(2)}`}>
                R$ {totalDespesas.toFixed(2)}
              </span>
              <span className="text-[9px] xs:text-[10px] text-slate-400 block mt-1 truncate">{state.expenses.length} cadastradas</span>
            </div>
          </div>

          {/* Card 4: Falta ou Sobrou */}
          <div className={`rounded-2xl p-3 sm:p-4 border flex flex-col justify-between min-w-0 ${sobrouIdeal > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-orange-50/50 border-orange-100/50 text-slate-900'}`}>
            <div className="flex items-center justify-between text-slate-400 mb-2 gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                {sobrouIdeal > 0 ? 'Sobrou (Lucro)' : 'Falta p/ Meta'}
              </span>
              {sobrouIdeal > 0 ? (
                <Sparkles size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <HelpCircle size={16} className="text-orange-400 shrink-0" />
              )}
            </div>
            <div className="min-w-0">
              {sobrouIdeal > 0 ? (
                <div className="min-w-0">
                  <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold font-display text-emerald-600 block truncate" title={`+R$ ${sobrouIdeal.toFixed(2)}`}>
                    +R$ {sobrouIdeal.toFixed(2)}
                  </span>
                  <span className="text-[9px] xs:text-[10px] text-emerald-600 font-semibold block mt-1 flex items-center gap-0.5 truncate">
                    <Flame size={10} className="shrink-0" /> Meta superada!
                  </span>
                </div>
              ) : (
                <div className="min-w-0">
                  <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold font-display text-orange-600 block truncate" title={`R$ ${restandoParaMeta.toFixed(2)}`}>
                    R$ {restandoParaMeta.toFixed(2)}
                  </span>
                  <span className="text-[9px] xs:text-[10px] text-slate-400 block mt-1 truncate">Falta concluir</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT DELIVERIES LOG */}
      <div id="recent_deliveries" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-bold font-display text-slate-900">
            Entregas Recentes de Hoje
          </h3>
          <span className="text-xs text-slate-400 font-medium">Mostrando as últimas 5</span>
        </div>

        {recentGanhos.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Bike className="mx-auto text-slate-300 mb-2" size={28} />
            <p className="text-slate-400 text-sm">Nenhuma entrega registrada ainda.</p>
            <p className="text-slate-400 text-xs mt-0.5">Clique nos botões acima para registrar seus ganhos!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentGanhos.map((del) => (
              <div
                key={del.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg font-bold text-xs uppercase ${del.type === 'ifood' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'}`}>
                    {del.type}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Entrega {del.type === 'ifood' ? 'iFood' : 'Quita'}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>Hoje às {formatTime(del.timestamp)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    R$ {del.value.toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteDelivery(del.id)}
                    className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir entrega"
                  >
                    <span className="text-xs">Excluir</span>
                  </button>
                </div>
              </div>
            ))}
            <div className="text-[11px] text-slate-400 text-center pt-2 italic">
              Você pode ver todas, limpar o histórico ou editar os valores unitários na aba de <b>Configurações</b>.
            </div>
          </div>
        )}
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        dayRegistrations={state.dayRegistrations || []}
        onUpdateDayStatus={updateDayStatus}
      />

    </div>
  );
}
