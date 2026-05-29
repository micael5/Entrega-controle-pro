/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Target, Flag, Plus, Trash2, Calendar, TrendingUp, Sparkles, AlertCircle, Info, Flame } from 'lucide-react';
import { AppState } from '../types';

interface MetaViewProps {
  state: AppState;
  addExtraGoal: (name: string, targetValue: number, daysLimit: number) => void;
  deleteExtraGoal: (id: string) => void;
}

export function MetaView({ state, addExtraGoal, deleteExtraGoal }: MetaViewProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [days, setDays] = useState('30');
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Calculations
  const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
  const totalGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
  const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
  const metaTotal = totalDespesas + totalObjetivosExtras;

  const progressoPercent = metaTotal > 0 ? Math.min(100, (totalGanhos / metaTotal) * 100) : 0;

  // Calculate daily target with and without extra goals
  const baseDailyTarget = totalDespesas / 30;
  
  // Extra goals each demand their own daily contribution (value / days limit)
  const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
    return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
  }, 0);

  const totalDailyTarget = baseDailyTarget + extraDailyTarget;

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
