/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Target, Flag, Plus, Trash2, Calendar, TrendingUp, Sparkles, AlertCircle, Info, Flame, History, RefreshCw, HelpCircle, ArrowRight, Settings, PlusCircle, MinusCircle, PiggyBank, DollarSign } from 'lucide-react';
import { AppState } from '../types';

interface MetaViewProps {
  state: AppState;
  addExtraGoal: (name: string, targetValue: number, daysLimit: number) => void;
  deleteExtraGoal: (id: string) => void;
  adjustAccumulatedGoal: (amount: number, description: string) => void;
  resetAccumulatedGoal: () => void;
  updateAnnualReserveConfig: (decimoTotal: number, feriasDiasCount: number, feriasDiarioValue: number) => void;
  depositReserves: (decimoAmount: number, feriasAmount: number, description: string) => void;
  adjustReserveBalance: (category: '13th' | 'vacation', amount: number, type: 'deposit' | 'withdraw', description: string) => void;
  resetReserveBalance: (category: '13th' | 'vacation') => void;
}

export function MetaView({
  state,
  addExtraGoal,
  deleteExtraGoal,
  adjustAccumulatedGoal,
  resetAccumulatedGoal,
  updateAnnualReserveConfig,
  depositReserves,
  adjustReserveBalance,
  resetReserveBalance
}: MetaViewProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [days, setDays] = useState('30');
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Interactive adjustments form states
  const [isAdjustFormOpen, setIsAdjustFormOpen] = useState(false);
  const [adjustedValueText, setAdjustedValueText] = useState('');
  const [adjustErrorMsg, setAdjustErrorMsg] = useState('');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  // Annual Reserve configuration inputs
  const [reserveDecimoTotal, setReserveDecimoTotal] = useState((state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500).toString());
  const [reserveFeriasDias, setReserveFeriasDias] = useState((state.feriasDias !== undefined ? state.feriasDias : 5).toString());
  const [reserveFeriasValorDiario, setReserveFeriasValorDiario] = useState((state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120).toString());
  const [isReserveConfigSaved, setIsReserveConfigSaved] = useState(false);
  const [reserveConfigError, setReserveConfigError] = useState('');

  // Balance adjustment popup/accordion states
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustCategory, setAdjustCategory] = useState<'13th' | 'vacation'>('13th');
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdraw'>('deposit');
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustDescInput, setAdjustDescInput] = useState('');
  const [adjustModalError, setAdjustModalError] = useState('');

  // Calculations
  const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
  const totalGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
  const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);

  // Proportional math logic starting from current month
  const d_now = new Date();
  const d_currentYear = d_now.getFullYear();
  const d_currentMonth = d_now.getMonth(); // 0-11
  const d_currentMonthStr = `${d_currentYear}-${String(d_currentMonth + 1).padStart(2, '0')}`;

  const monthsRemaining = Math.max(1, 12 - (d_currentMonth + 1) + 1);

  const decimoTerceiroTotal = state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00;
  const decimoTerceiroMensal = decimoTerceiroTotal / monthsRemaining;
  const decimoTerceiroUnadjustedDaily = decimoTerceiroMensal / 30;

  const feriasDias = state.feriasDias !== undefined ? state.feriasDias : 5;
  const feriasValorDiario = state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00;
  const feriasTotal = feriasDias * feriasValorDiario;
  const feriasMensal = feriasTotal / monthsRemaining;
  const feriasUnadjustedDaily = feriasMensal / 30;

  // Combine fixed expenses, extra goals and the proportional reserve values computed
  const metaTotal = totalDespesas + totalObjetivosExtras + (decimoTerceiroMensal * monthsRemaining) + (feriasMensal * monthsRemaining);

  const progressoPercent = metaTotal > 0 ? Math.min(100, (totalGanhos / metaTotal) * 100) : 0;

  // Calculate daily target with and without extra goals
  const baseDailyTarget = totalDespesas / 30;
  
  // Extra goals each demand their own daily contribution (value / days limit)
  const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
    return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
  }, 0);

  const totalDailyTarget = baseDailyTarget + extraDailyTarget + decimoTerceiroUnadjustedDaily + feriasUnadjustedDaily;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o nome do seu objetivo extra.');
      return;
    }
    const valParsed = parseFloat(value);
    if (isNaN(valParsed) || valParsed <= 0) {
      setErrorMsg('Informe um valor de meta válido maior que zero.');
      return;
    }
    const daysParsed = parseInt(days);
    if (isNaN(daysParsed) || daysParsed <= 0) {
      setErrorMsg('O limite de dias deve ser maior ou igual a 1.');
      return;
    }

    addExtraGoal(name.trim(), valParsed, daysParsed);
    setName('');
    setValue('');
    setDays('30');
    setShowForm(false);
    setSuccessMsg('Objetivo extra adicionado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1. Rollover Calculations
  const d_currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(d_currentMonthStr));
  const d_offDays = d_currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta');
  const d_numOffDays = d_offDays.length;
  const d_numWorkDays = Math.max(1, 30 - d_numOffDays);

  const d_todayStrDate = `${d_currentYear}-${String(d_currentMonth + 1).padStart(2, '0')}-${String(d_now.getDate()).padStart(2, '0')}`;
  const d_todayReg = (state.dayRegistrations || []).find(reg => reg.date === d_todayStrDate);
  const d_todayStatus = d_todayReg ? d_todayReg.status : 'trabalho';
  const d_isOffToday = d_todayStatus === 'folga' || d_todayStatus === 'falta';

  let d_adjustedDailyTargetForWorkingDays = totalDailyTarget;
  let d_adjustmentMultiplier = 1;
  if (!state.keepOriginalGoalToggle) {
    if (state.targetDivisionMode === 'concentrate') {
      d_adjustmentMultiplier = (30 / d_numWorkDays) * 1.25;
    } else {
      d_adjustmentMultiplier = 30 / d_numWorkDays;
    }
    d_adjustedDailyTargetForWorkingDays = totalDailyTarget * d_adjustmentMultiplier;
  }

  const decimoTerceiroDiarioAjustado = decimoTerceiroUnadjustedDaily * d_adjustmentMultiplier;
  const feriasDiarioAjustado = feriasUnadjustedDaily * d_adjustmentMultiplier;

  // Active target for today (including rollover value)
  const d_pendingRollover = state.accumulatedGoalPendente || 0;
  const d_activeTodayTarget = d_isOffToday ? 0 : (d_adjustedDailyTargetForWorkingDays + d_pendingRollover);

  // Today's real earnings (calendar day)
  const d_todayStr = new Date().toDateString();
  const d_hojeGanhos = state.deliveries
    .filter(del => {
      const d = new Date(del.timestamp);
      return d.toDateString() === d_todayStr;
    })
    .reduce((sum, del) => sum + del.value, 0);

  // Shortfall
  const d_missingValue = Math.max(0, d_activeTodayTarget - d_hojeGanhos);

  const handleOpenAdjustForm = () => {
    setAdjustedValueText(d_missingValue.toFixed(2));
    setIsAdjustFormOpen(true);
    setAdjustErrorMsg('');
    setAdjustSuccessMsg('');
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustErrorMsg('');
    setAdjustSuccessMsg('');

    const parsedAdj = parseFloat(adjustedValueText);
    if (isNaN(parsedAdj) || parsedAdj < 0) {
      setAdjustErrorMsg('Informe um valor de acúmulo válido (igual ou maior que zero).');
      return;
    }

    // Date formatting to DD/MM
    const getFormattedDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${mo}`;
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const desc = `Ajuste de meta: R$ ${parsedAdj.toFixed(2)} transferido do dia ${getFormattedDate(new Date())} para ${getFormattedDate(tomorrow)}`;
    
    adjustAccumulatedGoal(parsedAdj, desc);
    setIsAdjustFormOpen(false);
    setAdjustSuccessMsg(`🚀 Sucesso! R$ ${parsedAdj.toFixed(2)} foi acumulado para a meta do próximo dia de trabalho.`);
    setTimeout(() => {
      setAdjustSuccessMsg('');
    }, 5000);
  };

  const getMonthsListText = () => {
    const list = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return list.slice(d_currentMonth).join(', ');
  };

  const handleSaveReserveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setReserveConfigError('');
    setIsReserveConfigSaved(false);

    const parsedDecimo = parseFloat(reserveDecimoTotal);
    if (isNaN(parsedDecimo) || parsedDecimo < 0) {
      setReserveConfigError('Informe um valor de 13º salário válido.');
      return;
    }

    const parsedDias = parseInt(reserveFeriasDias);
    if (isNaN(parsedDias) || parsedDias < 0) {
      setReserveConfigError('Informe dias de férias válidos.');
      return;
    }

    const parsedDiario = parseFloat(reserveFeriasValorDiario);
    if (isNaN(parsedDiario) || parsedDiario < 0) {
      setReserveConfigError('Informe um ganho diário de férias válido.');
      return;
    }

    updateAnnualReserveConfig(parsedDecimo, parsedDias, parsedDiario);
    setIsReserveConfigSaved(true);
    setTimeout(() => setIsReserveConfigSaved(false), 4500);
  };

  const handleConfirmReserveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustModalError('');

    const parsedAmount = parseFloat(adjustAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAdjustModalError('Informe um valor válido maior que zero.');
      return;
    }

    if (!adjustDescInput.trim()) {
      setAdjustModalError('Informe o motivo/descrição da transação.');
      return;
    }

    adjustReserveBalance(
      adjustCategory,
      parsedAmount,
      adjustType,
      adjustDescInput.trim()
    );

    setAdjustAmountInput('');
    setAdjustDescInput('');
    setAdjustModalOpen(false);
  };

  return (
    <div id="meta_view_container" className="space-y-6">
      
      {/* Target summary banner */}
      <div id="meta_summary_card" className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Target size={180} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
              Configurador de Metas
            </span>
            <Flag size={20} className="text-indigo-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <span className="text-slate-400 text-xs block">Meta Total Atual</span>
              <span className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black font-display text-white mt-1 block truncate" title={`R$ ${metaTotal.toFixed(2)}`}>
                R$ {metaTotal.toFixed(2)}
              </span>
              <span className="text-slate-400 text-[10px] sm:text-xs block mt-1 break-words leading-relaxed">
                Base (Contas): R$ {totalDespesas.toFixed(2)} + Extras: R$ {totalObjetivosExtras.toFixed(2)}
              </span>
            </div>

            <div className="md:text-right min-w-0">
              <span className="text-slate-400 text-xs block">Meta Diária Necessária</span>
              <span className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black font-display text-amber-300 mt-1 block truncate" title={`R$ ${totalDailyTarget.toFixed(2)} / dia`}>
                R$ {totalDailyTarget.toFixed(2)} <span className="text-xs text-white">/ dia</span>
              </span>
              <span className="text-slate-400 text-[10px] sm:text-xs block mt-1 break-words leading-relaxed">
                Para cobrir contas (R$ {baseDailyTarget.toFixed(2)}) + objetivos (R$ {extraDailyTarget.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Combined Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-200 font-medium">Progresso até bater tudo</span>
              <span className="text-amber-300 font-bold font-mono">{progressoPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${progressoPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
           {/* ⚖️ AJUSTE E ARRASTO DE META — SISTEMA PROFISSIONAL */}
      <div id="drag_and_adjust_goal_card" className="bg-gradient-to-br from-orange-50/40 via-white to-red-50/20 rounded-3xl p-6 border-2 border-orange-400 shadow-md space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-orange-200/60">
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-lg font-display">⚖️ AJUSTE E ARRASTO DE META</h3>
          </div>
          <span className="text-[10px] uppercase font-black text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full tracking-wider shrink-0">
            Ajustar Dia Fraco
          </span>
        </div>

        <p className="text-slate-600 text-xs leading-relaxed">
          Se o seu dia foi fraco e você não atingiu a meta diária, arraste o valor restante para que ele se acumule no próximo dia útil de trabalho. Assim, você nunca perde o controle mensal!
        </p>

        {/* CÁLCULO TRIPLICE DO QUE FALTOU HOJE */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
          <div className="p-1">
            <span className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Meta Hoje</span>
            <span className="text-sm sm:text-base font-black text-slate-800 block mt-1 font-mono">
              R$ {d_activeTodayTarget.toFixed(2)}
            </span>
          </div>
          <div className="p-1 border-x border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Feito Hoje</span>
            <span className="text-sm sm:text-base font-black text-brand-600 block mt-1 font-mono">
              R$ {d_hojeGanhos.toFixed(2)}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Faltou</span>
            <span className={`text-sm sm:text-base font-black font-mono block mt-1 ${d_missingValue > 0 ? 'text-orange-650' : 'text-emerald-600'}`}>
              R$ {d_missingValue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Rollover status indicator */}
        <div className="flex items-center justify-between text-xs bg-slate-100/60 p-3 rounded-xl border border-slate-200">
          <span className="text-slate-600 font-bold">Acumulado pendente para próximo dia útil:</span>
          <span className="font-mono font-black text-slate-800 bg-white px-3 py-1 rounded-md border border-slate-250">
            R$ {d_pendingRollover.toFixed(2)}
          </span>
        </div>

        {/* CARD ACTIONS: ACTION BUTTONS */}
        <div id="meta_card_actions_container" className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              if (d_missingValue <= 0) {
                alert("Você já bateu sua meta de hoje! Não há saldo devedor para arrastar.");
                return;
              }
              const getFormattedDate = (d: Date) => {
                const day = String(d.getDate()).padStart(2, '0');
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                return `${day}/${mo}`;
              };
              const desc = `Arrasto automático de R$ ${d_missingValue.toFixed(2)} criado dia ${getFormattedDate(new Date())}`;
              adjustAccumulatedGoal(d_missingValue, desc);
              alert(`Sucesso! R$ ${d_missingValue.toFixed(2)} de saldo não vencido/dia fraco foi acumulado à meta para o próximo dia útil.`);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:scale-[1.01] text-white font-black text-xs py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 cursor-pointer active:scale-98"
          >
            <TrendingUp size={16} /> 📉 AJUSTAR META (DIA FRACO)
          </button>
          
          <button
            onClick={() => {
              if (confirm('Tem certeza de que deseja zerar os valores de meta acumulados pendentes?')) {
                resetAccumulatedGoal();
                alert('Saldos acumulados redefinidos com sucesso para R$ 0.00!');
              }
            }}
            className="bg-white border-2 border-red-500 hover:bg-red-50 hover:scale-[1.01] text-red-650 font-black text-xs py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
          >
            <RefreshCw size={15} /> 🔄 ZERAR VALORES ACUMULADOS
          </button>
        </div>

        {/* Custom roll toggle form */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsAdjustFormOpen(!isAdjustFormOpen)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            {isAdjustFormOpen ? '✖ Fechar ajuste manual sob medida' : '⚙️ Ajustar um valor personalizado sob medida...'}
          </button>
        </div>

        {isAdjustFormOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50/40 border border-orange-200 rounded-2xl p-4 space-y-3"
          >
            <form onSubmit={handleConfirmAdjust} className="space-y-3">
              {adjustErrorMsg && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{adjustErrorMsg}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Valor personalizado para jogar para frente (R$)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustedValueText}
                    onChange={(e) => setAdjustedValueText(e.target.value)}
                    className="flex-1 bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* TRANSFERS HISTORY LOG LIST */}
        {state.goalAdjustments && state.goalAdjustments.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History size={12} className="text-slate-400" /> Histórico de Ajustes de Meta
            </h4>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
              {state.goalAdjustments.slice(0, 5).map((adj) => (
                <div key={adj.id} className="text-[11px] flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <div className="space-y-0.5 pr-3 min-w-0 flex-1">
                    <span className="font-semibold text-slate-800 block leading-snug truncate">
                      {adj.description}
                    </span>
                    <span className="text-[10px] text-slate-450 block font-medium">
                      {adj.date}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-black shrink-0 px-2 py-0.5 rounded-md ${adj.amount > 0 ? 'text-orange-750 bg-orange-50 border border-orange-100' : 'text-slate-500 bg-slate-100'}`}>
                    {adj.amount > 0 ? `+R$ ${adj.amount.toFixed(2)}` : 'Zerar'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📅 RESERVA ANUAL — FÉRIAS E DÉCIMO TERCEIRO (COFRE PRO) */}
      <div id="annual_reserves_panel" className="bg-gradient-to-br from-amber-500/10 via-white to-blue-500/10 border-2 border-amber-350 rounded-3xl p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/60 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shrink-0">
              <PiggyBank size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[18px] font-display">📅 RESERVA ANUAL — FÉRIAS E DÉCIMO TERCEIRO</h3>
              <p className="text-[11px] text-slate-500 font-medium">Cofre de Acúmulo Proporcional para Autônomos</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full tracking-wider self-start sm:self-center">
            Padrão CLT
          </span>
        </div>

        {/* Proportional math logic description */}
        <div className="bg-amber-100/30 border border-amber-200/70 p-4 rounded-2xl text-xs text-slate-700 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-bold text-slate-800">
            <span>📅 Período de Planejamento: <strong className="text-amber-900">{getMonthsListText().split(', ')[0]}</strong> até <strong className="text-blue-700">Dezembro</strong></span>
            <span className="bg-amber-500/20 text-amber-950 text-[10.5px] px-3 py-0.5 rounded-full font-black border border-amber-300">
              Restam {monthsRemaining} meses no ano
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Calculado proporcionalmente com base nos meses restantes para acabar o ano. Esses valores são embutidos de forma suave e inteligente na sua meta diária!
          </p>
        </div>

        {/* METAS PROGRESS METRICS PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 13º Salário */}
          <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-amber-950 font-extrabold text-xs flex items-center gap-1">
                💰 13º Salário Desejado
              </span>
              <span className="text-[10.5px] font-mono text-amber-700 font-extrabold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-250">
                Meta: R$ {decimoTerceiroTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline gap-1">
                <span className="text-[11px] text-slate-500 font-medium">Guardado em cofre:</span>
                <span className="font-mono font-black text-amber-700 text-sm">
                  R$ {(state.decimoTerceiroSaved || 0).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-amber-400 h-full rounded-full" 
                  style={{ width: `${Math.min(100, ((state.decimoTerceiroSaved || 0) / Math.max(1, decimoTerceiroTotal)) * 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>{Math.min(100, ((state.decimoTerceiroSaved || 0) / Math.max(1, decimoTerceiroTotal)) * 100).toFixed(1)}% concluído</span>
                <span>Proporção: R$ {decimoTerceiroMensal.toFixed(2)} / mês</span>
              </div>
            </div>

            {/* Daily addition metric */}
            <div className="bg-white p-2.5 rounded-xl text-[10px] text-slate-600 flex justify-between items-center border border-amber-100/80 leading-none">
              <span>Sua contribuição diária:</span>
              <span className="font-bold text-slate-900 font-mono">
                + R$ {decimoTerceiroDiarioAjustado.toFixed(2)} / dia
              </span>
            </div>
          </div>

          {/* Card 2: Férias Cobertura */}
          <div className="bg-blue-50/10 rounded-2xl p-4 border border-blue-150 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-950 font-extrabold text-xs flex items-center gap-1">
                🏖️ Reserva de Férias
              </span>
              <span className="text-[10.5px] font-mono text-blue-700 font-extrabold bg-blue-150/50 px-2 py-0.5 rounded-md border border-blue-200">
                Meta: R$ {feriasTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline gap-1">
                <span className="text-[11px] text-slate-500 font-medium font-sans">Guardado ({feriasDias} dias cobertos):</span>
                <span className="font-mono font-black text-blue-700 text-sm">
                  R$ {(state.feriasSaved || 0).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-blue-550 h-full rounded-full" 
                  style={{ width: `${Math.min(100, ((state.feriasSaved || 0) / Math.max(1, feriasTotal)) * 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>{Math.min(100, ((state.feriasSaved || 0) / Math.max(1, feriasTotal)) * 100).toFixed(1)}% concluído</span>
                <span>Proporção: R$ {feriasMensal.toFixed(2)} / mês</span>
              </div>
            </div>

            {/* Daily addition metric */}
            <div className="bg-white p-2.5 rounded-xl text-[10px] text-slate-600 flex justify-between items-center border border-blue-100/80 leading-none">
              <span>Sua contribuição diária:</span>
              <span className="font-bold text-slate-900 font-mono">
                + R$ {feriasDiarioAjustado.toFixed(2)} / dia
              </span>
            </div>
          </div>
        </div>

        {/* CONFIGURAÇÃO INTERATIVA DAS RESERVAS */}
        <div className="bg-white/85 p-5 rounded-2xl border border-amber-250/65 shadow-xs space-y-4">
          <span className="text-xs font-black text-amber-950 block uppercase tracking-wider">🔹 Configurar Parâmetros de Reserva</span>
          
          <form onSubmit={handleSaveReserveConfig} className="space-y-4">
            {reserveConfigError && (
              <div className="bg-red-50 text-red-650 p-2.5 rounded-xl text-xs font-bold border border-red-200">
                ❌ {reserveConfigError}
              </div>
            )}
            {isReserveConfigSaved && (
              <div className="bg-emerald-50 text-emerald-850 p-2.5 rounded-xl text-xs font-bold border border-emerald-200">
                ✓ Configuração de reservas salva com sucesso!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  13º Salário Desejado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={reserveDecimoTotal}
                  onChange={(e) => setReserveDecimoTotal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Dias de Férias
                </label>
                <input
                  type="number"
                  min="0"
                  value={reserveFeriasDias}
                  onChange={(e) => setReserveFeriasDias(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Valor por Dia de Férias (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={reserveFeriasValorDiario}
                  onChange={(e) => setReserveFeriasValorDiario(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              💾 Salvar Parâmetros das Reservas
            </button>
          </form>
        </div>

        {/* LANÇAMENTO MANUAL DE DEPÓSITO OU RETIRADA */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">📥 Movimento Manual de Saldo</span>
            <button
              type="button"
              onClick={() => setAdjustModalOpen(!adjustModalOpen)}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
            >
              {adjustModalOpen ? '✖ Fechar painel de lançamento' : '⚙️ Fazer Lançamento Manual (Depósito/Saque)...'}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Precisa fazer um aporte extra voluntário ou realizar o saque de um valor guardado das suas férias ou décimo terceiro? Utilize essa ferramenta.
          </p>

          {adjustModalOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden"
            >
              <form onSubmit={handleConfirmReserveAdjustment} className="space-y-3">
                {adjustModalError && (
                  <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-xs font-semibold">
                    ⚠️ {adjustModalError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Reserva Alvo</label>
                    <select
                      value={adjustCategory}
                      onChange={(e) => setAdjustCategory(e.target.value as '13th' | 'vacation')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="13th">13º Salário</option>
                      <option value="vacation">Férias</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Operação</label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as 'deposit' | 'withdraw')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="deposit">📥 Depositar (+)</option>
                      <option value="withdraw">📤 Retirar / Sacar (–)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={adjustAmountInput}
                      onChange={(e) => setAdjustAmountInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Descrição / Motivo</label>
                  <input
                    type="text"
                    placeholder="Ex: Depósito extra voluntário, Resgate para viagem"
                    value={adjustDescInput}
                    onChange={(e) => setAdjustDescInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-755 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-lg transition-all cursor-pointer shadow-sm text-center block"
                >
                  Confirmar Lançamento no Cofre
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* HISTÓRICO DE CONFIGURAÇÃO E DEPÓSITOS FINANCEIROS */}
        {state.annualReserveHistory && state.annualReserveHistory.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History size={12} className="text-slate-400 mr-0.5" /> Histórico de Transações de Reserva
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {[...state.annualReserveHistory].reverse().map((entry) => (
                <div key={entry.id} className="text-[11px] flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                    <span className="font-semibold text-slate-800 block leading-snug truncate">
                      {entry.description}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {entry.date}
                    </span>
                  </div>
                  <span 
                    className={`text-[10.5px] font-mono font-black shrink-0 px-2 py-0.5 rounded-md ${
                      entry.type === 'deposit' 
                        ? 'text-amber-800 bg-amber-50 border border-amber-100' 
                        : 'text-red-800 bg-red-50 border border-red-100'
                    }`}
                  >
                    {entry.type === 'deposit' ? '+' : '–'} R$ {entry.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action alerts */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-xl p-4 text-sm flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Subheader and Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold font-display text-slate-800">Objetivos Extras</h2>
        {!showForm && (
          <button
            id="register_extra_goal_toggle"
            onClick={() => setShowForm(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Novo Objetivo
          </button>
        )}
      </div>

      {/* Hidden Collapsible Form */}
      {showForm && (
        <motion.div
          id="add_goal_form_container"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4 overflow-hidden"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="font-bold text-slate-800">Adicionar novo projeto/desejo</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 rounded-xl p-3 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome do Objetivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Minha bike nova, Roupas, Celular..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor Total Necessário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1200.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dias Limite para conquistar
                </label>
                <input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white cursor-pointer text-sm font-bold py-3 rounded-xl transition-all shadow-sm"
            >
              Calcular e Integrar à Meta Geral
            </button>
          </form>
        </motion.div>
      )}

      {/* Goal items listing */}
      <div id="goals_list_container" className="space-y-4">
        {state.extraGoals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 flex flex-col justify-center items-center p-6">
            <div className="bg-indigo-50 text-indigo-500 p-4 rounded-full mb-3">
              <Target size={32} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Nenhum Objetivo Extra Cadastrado</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Você trabalha além das contas fixas por um sonho? Adicione objetivos extras (como celular novo, bike nova) e o aplicativo calcula as corridas diárias adicionais!
            </p>
          </div>
        ) : (
          state.extraGoals.map((goal) => {
            const dailyRequirement = goal.targetValue / goal.daysLimit;
            // Let's calculate the progress on this specific goal
            // In a proportional piggy bank, the goal gets a share of earnings as well!
            // Let's display how much must be earned daily just for this.
            
            return (
              <div
                key={goal.id}
                className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 min-w-0"
              >
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                      Objetivo
                    </span>
                    <h3 className="font-bold text-slate-800 text-base truncate flex-1 min-w-0" title={goal.name}>{goal.name}</h3>
                  </div>

                  {/* Goal detailed variables */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 py-1 text-[11px] sm:text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Prazo: <b>{goal.daysLimit} d</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TrendingUp size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Ganho extra: <b className="text-indigo-600">R$ {dailyRequirement.toFixed(2)}/d</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 xs:col-span-2 lg:col-span-1 min-w-0">
                      <Sparkles size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate">Total: <b>R$ {goal.targetValue.toFixed(2)}</b></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 shrink-0">
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <span className="text-[10px] xs:text-xs text-slate-400 block sm:text-right">Ajuste na meta diária</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 shrink-0 block mt-0.5">
                      + R$ {dailyRequirement.toFixed(2)} / dia
                    </span>
                  </div>
                  
                  {/* Delete Button on settings */}
                  <button
                    onClick={() => deleteExtraGoal(goal.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer w-full sm:w-auto flex justify-center items-center gap-1 text-xs font-semibold"
                    title="Remover objetivo"
                  >
                    <Trash2 size={16} className="shrink-0" /> <span className="sm:hidden">Remover</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info helper card */}
      <div className="bg-amber-50 text-amber-900 rounded-3xl p-6 border border-amber-100/60 flex gap-4">
        <Info size={24} className="text-brand-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm">Garantia contra prejuízo</h4>
          <p className="text-slate-600 text-xs leading-relaxed">
            Seja rígido com a meta diária calculada! Se você bater a meta diária todos os dias, as contas fixas do mês (Aluguel, Compras, Manutenção) e seus planos adicionais estarão 100% garantidos e pagos em dia.
          </p>
        </div>
      </div>

    </div>
  );
}
