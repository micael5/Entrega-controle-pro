/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { PiggyBank, Landmark, ShieldCheck, Heart, Sparkles, AlertCircle, Info, TrendingUp, HandCoins } from 'lucide-react';
import { AppState } from '../types';

interface CofrinhoViewProps {
  state: AppState;
}

export function CofrinhoView({ state }: CofrinhoViewProps) {
  // Calculations
  const totalGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
  const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
  const totalObjetivosExtras = state.extraGoals.reduce((sum, goal) => sum + goal.targetValue, 0);
  const metaTotal = totalDespesas + totalObjetivosExtras;

  // Let's create a list of all targets for the cofrinho (expenses + goals combined)
  const allSavingsBuckets = [
    ...state.expenses.map((exp) => {
      const ratio = metaTotal > 0 ? exp.value / metaTotal : 0;
      const allocatedAmount = totalGanhos >= metaTotal ? exp.value : totalGanhos * ratio;
      return {
        id: exp.id,
        name: exp.name,
        targetValue: exp.value,
        allocatedAmount: allocatedAmount,
        type: 'expense' as const,
        detail: `Controle (Vence dia ${exp.dueDate})`,
      };
    }),
    ...state.extraGoals.map((g) => {
      const ratio = metaTotal > 0 ? g.targetValue / metaTotal : 0;
      const allocatedAmount = totalGanhos >= metaTotal ? g.targetValue : totalGanhos * ratio;
      return {
        id: g.id,
        name: g.name,
        targetValue: g.targetValue,
        allocatedAmount: allocatedAmount,
        type: 'goal' as const,
        detail: `Objetivo Extra (${g.daysLimit} dias)`,
      };
    }),
    {
      id: 'res_decimo_box',
      name: '13º Salário',
      targetValue: state.decimoTerceiroTotal !== undefined ? state.decimoTerceiroTotal : 1500.00,
      allocatedAmount: state.decimoTerceiroSaved || 0,
      type: 'reserve' as const,
      detail: 'Reserva Anual (Provisionado mensalmente)',
    },
    {
      id: 'res_ferias_box',
      name: 'Férias Cobertura',
      targetValue: (state.feriasDias !== undefined ? state.feriasDias : 5) * (state.feriasValorDiario !== undefined ? state.feriasValorDiario : 120.00),
      allocatedAmount: state.feriasSaved || 0,
      type: 'reserve' as const,
      detail: `Reserva de Férias (${state.feriasDias !== undefined ? state.feriasDias : 5} dias)`,
    }
  ];

  // Allocation logic:
  // If we have total_ganhos G, we allocate to each bucket proportionally or sequentially.
  // Proportional weight allocation based on targetValue:
  // allocation = min(targetValue, G * (targetValue / metaTotal))
  // If earnings supercede metaTotal, each receives exactly its targetValue.
  const isSuperceeded = totalGanhos >= metaTotal;
  const surplus = isSuperceeded ? totalGanhos - metaTotal : 0;

  return (
    <div id="cofrinho_view_container" className="space-y-6">
      
      {/* Mini head banner */}
      <div id="piggy_bank_gauge" className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="bg-white/20 text-emerald-100 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Reservas & Cofrinho
          </span>
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-black font-display mt-2 truncate" title={`R$ ${totalGanhos.toFixed(2)}`}>
            R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h1>
          <p className="text-emerald-100 text-[10px] sm:text-xs mt-1 leading-normal">
            Total geral recebido até agora dividido e provisionado.
          </p>
        </div>
        <div className="bg-white/10 p-3 sm:p-4 rounded-2xl shrink-0">
          <PiggyBank size={36} className="text-amber-300 sm:w-12 sm:h-12" />
        </div>
      </div>

      {/* Surplus alert if excess exists */}
      {isSuperceeded && (
        <div className="bg-emerald-50 text-emerald-900 rounded-3xl p-5 border border-emerald-100 flex items-center gap-4">
          <div className="bg-emerald-500 text-white p-3 rounded-full">
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Todas as contas pagas & Meta batida!</h4>
            <p className="text-slate-600 text-xs mt-0.5">
              Você tem um lucro livre de <b className="text-emerald-600">R$ {surplus.toFixed(2)}</b> que pode gastar sem medo! Suas contas e objetivos estão 100% cobertos.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Piggy Banks folder */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold font-display text-slate-800">Suas Caixas Individuais</h2>
        <span className="text-xs text-slate-400 font-semibold">{allSavingsBuckets.length} pastas de provisão</span>
      </div>

      {allSavingsBuckets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-6">
          <PiggyBank className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm font-semibold">Nenhuma conta ou meta ativa.</p>
          <p className="text-slate-400 text-xs mt-0.5">Volte e configure de forma permanente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allSavingsBuckets.map((bucket) => {
            const allocatedAmount = bucket.allocatedAmount;
            const progress = bucket.targetValue > 0 ? Math.min(100, (allocatedAmount / bucket.targetValue) * 100) : 0;
            const remainsText = Math.max(0, bucket.targetValue - allocatedAmount);

            return (
              <div
                key={bucket.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3 hover:border-slate-200/80 transition-all min-w-0"
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-800 font-display truncate" title={bucket.name}>{bucket.name}</h3>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{bucket.detail}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${bucket.type === 'expense' ? 'bg-orange-50 text-brand-600' : bucket.type === 'goal' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'}`}>
                    {bucket.type === 'expense' ? 'Conta' : bucket.type === 'goal' ? 'Objetivo' : 'CLT Reserva'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-1 text-[11px] sm:text-xs font-mono min-w-0">
                    <span className="text-slate-450 font-sans shrink-0">Guardado</span>
                    <span className={`font-bold truncate max-w-full ${progress >= 100 ? 'text-emerald-600' : 'text-slate-755'}`} title={`R$ ${allocatedAmount.toFixed(2)} / R$ ${bucket.targetValue.toFixed(2)}`}>
                      R$ {allocatedAmount.toFixed(2)} <span className="text-slate-300 font-light font-sans">/</span> R$ {bucket.targetValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progress >= 100 ? 'bg-emerald-500' : bucket.type === 'expense' ? 'bg-brand-500' : bucket.type === 'goal' ? 'bg-indigo-505' : 'bg-amber-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 gap-1 flex-wrap">
                    <span>{progress.toFixed(0)}% provisionado</span>
                    {remainsText > 0 ? (
                      <span className="truncate">Falta R$ {remainsText.toFixed(2)}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5 shrink-0">✔ Coberto</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Plus: Extra Card for Free Surplus */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-emerald-800 font-display">Saldo Livre / Lucro Excedente</h3>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Disponível para saque e uso pessoal</span>
              </div>
              <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full">
                <HandCoins size={16} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-medium">Acumulado acima da meta total do mês:</div>
              <span className="text-2xl font-black font-display text-emerald-600 font-mono">
                R$ {surplus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Apenas gaste ou transfira este saldo livre. Os outros cofres devem ser preservados para saldar suas obrigações no final do mês sem surpresas!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* How to transfer explanatory card */}
      <div className="bg-slate-50 text-slate-700 rounded-3xl p-6 border border-slate-200/60 flex gap-4">
        <Info size={24} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm">Como funciona o provisionamento?</h4>
          <p className="text-slate-500 text-xs leading-relaxed">
            Cada vez que você registra uma entrega iFood ou Quita, o aplicativo calcula na mesma hora o percentual financeiro que cabe a cada despespa de forma independente. Dessa forma, você nunca gasta o dinheiro do aluguel com diversão por engano.
          </p>
        </div>
      </div>

    </div>
  );
}
