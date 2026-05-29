/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Check, Coffee, AlertCircle, RefreshCw } from 'lucide-react';
import { DayRegistration, DayStatus } from '../types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayRegistrations: DayRegistration[];
  onUpdateDayStatus: (date: string, status: DayStatus) => void;
}

export function CalendarModal({
  isOpen,
  onClose,
  dayRegistrations,
  onUpdateDayStatus
}: CalendarModalProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  if (!isOpen) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11
  
  // Format current year/month name in Portuguese
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonthIdx];

  // Number of days in current month
  const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  
  // Days offset to map starting week day (0: Sunday, 1: Monday, etc.)
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();

  // Create list of days for grid rendering
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  const getStatusForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const found = dayRegistrations.find(reg => reg.date === dateStr);
    return found ? found.status : 'trabalho';
  };

  const dayOfWeekHeaders = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Current selected day date details to show in status manager
  const getSelectedDayDetails = () => {
    if (!selectedDateStr) return null;
    const [_, m, d] = selectedDateStr.split('-');
    const dayNum = parseInt(d);
    const status = dayRegistrations.find(r => r.date === selectedDateStr)?.status || 'trabalho';
    return { dayNum, status };
  };

  const selectedDetails = getSelectedDayDetails();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-orange-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar size={18} className="text-orange-200" />
              <div>
                <h3 className="font-bold text-sm tracking-tight leading-none">Minha Agenda</h3>
                <p className="text-[10px] text-orange-200 mt-1 uppercase font-semibold">
                  Definir Folgas & Faltas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Calendar Panel */}
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {currentMonthName} {currentYear}
              </span>
              <span className="text-[9.5px] font-mono text-slate-400">
                Garantia de Meta Automática
              </span>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-slate-400 py-1 border-b border-slate-100">
                {dayOfWeekHeaders.map((h, i) => (
                  <span key={i}>{h}</span>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1 pt-1.5">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} />;
                  }

                  const dateKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDateStr === dateKey;
                  const status = getStatusForDay(day);

                  // Formatting styles based on work, off or absence
                  let badgeColor = '';
                  let textColor = 'text-slate-800';
                  let ringStyle = '';

                  if (status === 'folga') {
                    badgeColor = 'bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold border-amber-200';
                    textColor = 'text-amber-800';
                  } else if (status === 'falta') {
                    badgeColor = 'bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold border-rose-200';
                    textColor = 'text-rose-800';
                  } else {
                    badgeColor = 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-100';
                  }

                  if (isSelected) {
                    ringStyle = 'ring-2 ring-brand-500 ring-offset-1 bg-brand-50 border-brand-200';
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedDateStr(dateKey)}
                      className={`h-9 font-display text-xs rounded-lg flex flex-col items-center justify-center border cursor-pointer transition-all ${badgeColor} ${ringStyle} ${textColor}`}
                    >
                      <span className="font-semibold">{day}</span>
                      {status !== 'trabalho' && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${status === 'folga' ? 'bg-amber-600' : 'bg-rose-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current day selection dashboard */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {selectedDateStr ? (
                <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700">
                      Dia {selectedDetails?.dayNum} de {currentMonthName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 capitalize">
                      status atual: <b className="text-slate-600 underline">{selectedDetails?.status === 'trabalho' ? 'trabalho' : selectedDetails?.status === 'folga' ? 'folga' : 'falta'}</b>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Selecione a Situação Desejada:
                    </span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Button: Trabalho */}
                      <button
                        onClick={() => onUpdateDayStatus(selectedDateStr, 'trabalho')}
                        className={`py-2 px-1 rounded-xl text-[10.5px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${selectedDetails?.status === 'trabalho' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <Check size={14} />
                        Trabalho
                      </button>

                      {/* Button: Folga */}
                      <button
                        onClick={() => onUpdateDayStatus(selectedDateStr, 'folga')}
                        className={`py-2 px-1 rounded-xl text-[10.5px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${selectedDetails?.status === 'folga' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <Coffee size={14} />
                        Folga
                      </button>

                      {/* Button: Falta */}
                      <button
                        onClick={() => onUpdateDayStatus(selectedDateStr, 'falta')}
                        className={`py-2 px-1 rounded-xl text-[10.5px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${selectedDetails?.status === 'falta' ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <AlertCircle size={14} />
                        Falta
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
                  💡 Selecione qualquer dia acima para definir folga ou falta e recalcular metas.
                </div>
              )}
            </div>

            {/* Informational footer advice inside calendar */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-start gap-2.5">
              <RefreshCw size={14} className="text-brand-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-500 leading-relaxed">
                As datas assinaladas como <b>Folga</b> ou <b>Falta</b> são abatidas no mês e redistribuem automaticamente todo o saldo de despesas nos dias de trabalho restantes!
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
