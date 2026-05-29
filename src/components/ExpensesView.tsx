/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Receipt, Calendar, Calculator, Info, Landmark, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { Expense, AppState } from '../types';

interface ExpensesViewProps {
  state: AppState;
  addExpense: (name: string, value: number, dueDate: number) => void;
  deleteExpense: (id: string) => void;
}

export function ExpensesView({ state, addExpense, deleteExpense }: ExpensesViewProps) {
  // Local form state
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState('20');
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Selected delivery sim rate for piggy bank link (represented as string to allow full editing, erasing, etc.)
  const [simDeliveryValue, setSimDeliveryValue] = useState<string>('');

  const parsedSimValue = parseFloat(simDeliveryValue) || 0;

  // Total expenses
  const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor, informe o nome da despespa.');
      return;
    }
    const parsedVal = parseFloat(value);
    if (isNaN(parsedVal) || parsedVal <= 0) {
      setErrorMsg('Informe um valor de despesa válido e maior que zero.');
      return;
    }
    const parsedDue = parseInt(dueDate);
    if (isNaN(parsedDue) || parsedDue < 1 || parsedDue > 31) {
      setErrorMsg('O dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    addExpense(name.trim(), parsedVal, parsedDue);
    setName('');
    setValue('');
    setDueDate('20');
    setShowAddForm(false);
    setSuccessMsg('Despesa cadastrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };
  return (
    <div id="expenses_view_container" className="space-y-6">
      
      {/* Overview Card */}
      <div id="expenses_overview" className="bg-gradient-to-br from-amber-500 to-brand-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
            Controle de Despesas
          </span>
          <Receipt size={24} className="opacity-80" />
        </div>
        <h1 className="text-3xl font-bold font-display">
          R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <p className="text-amber-100 text-sm mt-1">
          Total de contas fixas e provisões registradas para este mês.
        </p>

        {/* Proportional info bar */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-amber-200 block">Reserva diária total</span>
            <span className="font-mono font-bold text-base text-white">
              R$ {(totalDespesas / 30).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-amber-200 block">Reserva semanal total</span>
            <span className="font-mono font-bold text-base text-white">
              R$ {((totalDespesas / 30) * 7).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Register alert banners */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-xl p-4 text-sm flex items-center gap-2">
          <Check size={18} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Button to toggle add new expense form */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold font-display text-slate-800">Suas Contas Cadastradas</h2>
        {!showAddForm && (
          <button
            id="register_expense_toggle"
            onClick={() => setShowAddForm(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white cursor-pointer select-none text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Nova Despesa
          </button>
        )}
      </div>

      {/* Hidden Collapsible Add Form */}
      {showAddForm && (
        <motion.div
          id="add_expense_form_container"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4 overflow-hidden"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="font-bold text-slate-800">Cadastrar Nova Despesa</h3>
            <button
              onClick={() => setShowAddForm(false)}
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
                  Nome da Despesa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Internet, Lanche..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor Total (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 800.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dia do Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm"
            >
              Adicionar ao Controle Financeiro
            </button>
          </form>
        </motion.div>
      )}

      {/* Table of active, calculated reserves */}
      <div id="expense_items" className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={20} className="text-brand-500 shrink-0" />
          <h3 className="text-base sm:text-md font-bold text-slate-800 truncate">Custo Proporcional de Reserva</h3>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse min-w-[420px] sm:min-w-0">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-1">Despesa</th>
                <th className="py-3 px-1">Venc.</th>
                <th className="py-3 px-1 text-right">Valor Mês</th>
                <th className="py-3 px-1 text-right text-brand-600">Por Dia</th>
                <th className="py-3 px-1 text-right text-amber-600">Por Semana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.expenses.map((expense) => {
                const daily = expense.value / 30;
                const weekly = daily * 7;
                return (
                  <tr key={expense.id} className="text-[11px] xs:text-xs sm:text-sm hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 sm:py-3.5 px-1 font-semibold text-slate-800 truncate max-w-[100px] sm:max-w-none" title={expense.name}>
                      {expense.name}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1">
                      <span className="bg-slate-100 text-slate-600 text-[9px] sm:text-xs font-medium px-1 sm:px-2 py-0.5 rounded-md flex items-center gap-1 w-fit whitespace-nowrap">
                        <Calendar size={10} className="sm:w-3 sm:h-3 shrink-0" /> Dia {expense.dueDate}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 text-right font-semibold text-slate-900 font-mono">
                      R$ {expense.value.toFixed(2)}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 text-right font-bold text-brand-600 font-mono">
                      R$ {daily.toFixed(2)}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 text-right font-bold text-amber-600 font-mono">
                      R$ {weekly.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-blue-50/50 text-blue-800 rounded-2xl p-4 mt-4 flex gap-3 text-xs">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Como usar o cálculo de reserva?</p>
            <p className="text-slate-500 mt-0.5 leading-relaxed">
              Para pagar suas contas fixas em dia, você deve guardar exatamente os valores listados na coluna <b>Por Dia</b> para cada conta de acordo com as suas corridas concluídas.
            </p>
          </div>
        </div>
      </div>

      {/* COFRINHO LINKED WIDGET (Proportional division per single delivery) */}
      <div id="cofrinho_rate_widget" className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <Landmark size={20} className="text-teal-600 shrink-0" />
          <h3 className="text-base sm:text-md font-bold text-slate-800 truncate">Vínculo ao Cofrinho: Rateio Real por Corrida</h3>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm">
          Veja abaixo como dividir instantaneamente o valor de <b>uma entrega isolada</b> para abastecer a caixinha de cada despespa proporcionalmente à sua importância no seu orçamento:
        </p>

        {/* Input selection for run value simulation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-1 truncate">
              Valor da Entrega Simulação
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-850">R$</span>
              <input
                type="number"
                step="any"
                value={simDeliveryValue}
                onChange={(e) => setSimDeliveryValue(e.target.value)}
                placeholder="0,00"
                className="bg-transparent border-b-2 border-slate-300 focus:border-brand-500 font-bold text-base sm:text-lg text-slate-800 pb-0.5 w-24 focus:outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setSimDeliveryValue('7')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${parseFloat(simDeliveryValue) === 7 ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              R$ 7,00 (Padrão)
            </button>
            <button
              onClick={() => setSimDeliveryValue('10')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${parseFloat(simDeliveryValue) === 10 ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              R$ 10,00
            </button>
          </div>
        </div>

        {totalDespesas === 0 ? (
          <div className="text-slate-400 text-xs py-3 text-center">Cadastre despesas para ver a divisão do dinheiro por corrida.</div>
        ) : (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Ao receber R$ {parsedSimValue.toFixed(2)}, você deve separar:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {state.expenses.map((exp) => {
                const ratio = exp.value / totalDespesas;
                const portion = parsedSimValue * ratio;
                return (
                  <div key={exp.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100/60 gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-600 truncate flex-1 min-w-0" title={exp.name}>{exp.name}</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 shrink-0">
                      R$ {portion.toFixed(2)} <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">({(ratio * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 italic text-center pt-2">
              Esta divisão é feita proporcionalmente com base no quanto essa conta representa do seu custo de vida total.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
