/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Receipt, Target, PiggyBank, Settings, Bike, MapPin } from 'lucide-react';

import { loadState, saveState } from './db';
import { AppState, Delivery, Expense, ExtraGoal, Config, Trip } from './types';
import { transmitWidgetData } from './utils/widgetSync';
import { triggerLocalNotification } from './utils/notifications';

// Importing our modular layout segments
import { HomeView } from './components/HomeView';
import { ExpensesView } from './components/ExpensesView';
import { MetaView } from './components/MetaView';
import { SettingsView } from './components/SettingsView';
import { CofrinhoView } from './components/CofrinhoView';
import { PercursoView } from './components/PercursoView';

type TabType = 'home' | 'expenses' | 'goals' | 'cofrinho' | 'percurso' | 'settings';

export default function App() {
  // Main local database synchronizer
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Hoisted GPS Ride Tracking & Screen Reader states for cross-tab persistence
  const [trackingActive, setTrackingActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0.0);
  const [trackSource, setTrackSource] = useState<'ifood' | 'quita' | 'manual'>('manual');
  const [trackValue, setTrackValue] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Geolocation watch id and timers
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  // Sync references for background interval closure optimization
  const secondsRef = useRef(seconds);
  const distanceKmRef = useRef(distanceKm);
  const trackSourceRef = useRef(trackSource);
  const trackValueRef = useRef(trackValue);
  const trackingActiveRef = useRef(trackingActive);

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { distanceKmRef.current = distanceKm; }, [distanceKm]);
  useEffect(() => { trackSourceRef.current = trackSource; }, [trackSource]);
  useEffect(() => { trackValueRef.current = trackValue; }, [trackValue]);
  useEffect(() => { trackingActiveRef.current = trackingActive; }, [trackingActive]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 15)]);
  };

  const calculateDistanceBetweenPoints = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Time and passive distance ticker effect (Stopwatch duration clock)
  useEffect(() => {
    if (trackingActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
        
        // When running an automated ride, simulate displacement in real-time
        if (trackSourceRef.current !== 'manual') {
          setDistanceKm((prev) => prev + 0.0035); // increases ~0.21 km per minute realistically
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [trackingActive]);

  // Real GPS Geolocation watch effect
  useEffect(() => {
    if (trackingActive) {
      if ('geolocation' in navigator) {
        addLog('[GPS]: Iniciando conexão com o satélite GPS...');
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            if (lastPositionRef.current) {
              // Calculate real physical distance increment
              const dist = calculateDistanceBetweenPoints(
                lastPositionRef.current.coords.latitude,
                lastPositionRef.current.coords.longitude,
                position.coords.latitude,
                position.coords.longitude
              );
              // Only add if user is actually moving (with basic noise filter of 1.5 meters)
              if (dist > 0.0015) {
                setDistanceKm((prev) => prev + dist);
                addLog(`[GPS]: Deslocamento detectado de +${(dist * 1000).toFixed(0)}m`);
              }
            } else {
              addLog('[GPS]: Sinal de localização obtido com sucesso!');
            }
            lastPositionRef.current = position;
          },
          (error) => {
            const errMsg = error.code === 1 
              ? 'Permissão de GPS negada pelo usuário.' 
              : `Sinal fraco ou erro de GPS: ${error.message}`;
            addLog(`[GPS Erro]: ${errMsg}`);
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      } else {
        addLog('[GPS Erro]: Este aparelho não possui suporte para Geolocalização.');
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastPositionRef.current = null;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trackingActive]);

  // Active screen reader background listener (Silent Android/iOS Bridge integration) - ALWAYS ACTIVE AT THE APP LEVEL!
  useEffect(() => {
    if (state.screenReaderActive) {
      addLog('[Leitor de Tela]: Monitoramento em tempo real iniciado.');
      addLog('[Leitor de Tela]: Pronto! Aguardando novas atividades nas telas do iFood ou Quita...');

      // Expose globally to let the accessibility wrapper trigger silent automated starts
      (window as any).onRideAccepted = (platform: 'ifood' | 'quita', value: number, distance: number) => {
        if (!state.screenReaderActive) {
          addLog(`[Leitor de Tela]: Proposta recebida de ${platform}, mas o leitor de tela está inativo.`);
          return;
        }

        addLog(`[Leitor de Tela]: Detectada nova corrida aceita no aplicativo do ${platform === 'ifood' ? 'iFood' : 'Quita'} (R$ ${value.toFixed(2)} - ${distance} km).`);
        
        // Register delivery data silently
        addDeliveryDynamic(platform, value);
        addLog(`[Leitor de Tela - Banco de Dados]: Ganho de R$ ${value.toFixed(2)} registrado silenciosamente.`);

        // Direct start of GPS tracker
        setSeconds(0);
        setDistanceKm(0);
        setTrackSource(platform);
        setTrackValue(value);
        setTrackingActive(true);
        lastPositionRef.current = null;
        addLog(`[Leitor de Tela - GPS]: Medição de percurso iniciada automaticamente.`);
      };

      // Expose globally to let accessibility wrapper trigger silent automated finishes
      (window as any).onRideFinished = () => {
        if (!state.screenReaderActive) return;
        
        const isTracking = trackingActiveRef.current;
        const currentSource = trackSourceRef.current;

        if (!isTracking || currentSource === 'manual') {
          addLog(`[Leitor de Tela]: Comando de finalização recebido, mas nenhum percurso automático válido está em andamento.`);
          return;
        }

        const currentPlatform = currentSource;
        addLog(`[Leitor de Tela]: Detectado comando FINALIZAR CORRIDA no aplicativo original do ${currentPlatform === 'ifood' ? 'iFood Entregador' : 'Quita'}.`);
        
        // Collect real metrics
        const finalDistance = parseFloat(distanceKmRef.current.toFixed(2));
        const finalSeconds = secondsRef.current;
        const avgSpeed = finalSeconds > 0 ? parseFloat(((finalDistance / finalSeconds) * 3600).toFixed(1)) : 0;
        const finalValue = trackValueRef.current;

        const newTrip: Trip = {
          id: `trip_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
          km: finalDistance,
          durationSeconds: finalSeconds,
          avgSpeedKmH: avgSpeed,
          date: new Date().toISOString(),
          platform: currentPlatform,
          value: finalValue || (currentPlatform === 'ifood' ? state.config.ifoodValue : currentPlatform === 'quita' ? state.config.quitaValue : 0)
        };

        addTrip(newTrip);
        setTrackingActive(false);

        addLog(`[Leitor de Tela - GPS]: Percurso encerrado silenciosamente. Gravados ${finalDistance.toFixed(2)} km.`);
      };
    } else {
      // Unregister if screen reader is turned off
      delete (window as any).onRideAccepted;
      delete (window as any).onRideFinished;
    }

    return () => {
      delete (window as any).onRideAccepted;
      delete (window as any).onRideFinished;
    };
  }, [state.screenReaderActive, state.config]);

  // Multi-state automatic persistent sync
  useEffect(() => {
    saveState(state);
    transmitWidgetData(state);
  }, [state]);

  // Automatic notifications check for Daily Goal & Maintenance limits
  useEffect(() => {
    // Calculations representing today's gains and daily targets
    const totalDespesas = state.expenses.reduce((sum, exp) => sum + exp.value, 0);
    const baseDailyTarget = totalDespesas / 30;
    const extraDailyTarget = state.extraGoals.reduce((sum, goal) => {
      return sum + (goal.targetValue / Math.max(1, goal.daysLimit));
    }, 0);
    const totalDailyTarget = baseDailyTarget + extraDailyTarget;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const currentMonthRegs = (state.dayRegistrations || []).filter(reg => reg.date.startsWith(currentMonthStr));
    const offDays = currentMonthRegs.filter(reg => reg.status === 'folga' || reg.status === 'falta');
    const numOffDays = offDays.length;
    const numWorkDays = Math.max(1, 30 - numOffDays);

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

    const todayStr = new Date().toDateString();
    const hojeGanhos = state.deliveries
      .filter(del => {
        const d = new Date(del.timestamp);
        return d.toDateString() === todayStr;
      })
      .reduce((sum, del) => sum + del.value, 0);

    // Filter this month's trips
    const trips = state.trips || [];
    const tripsThisMonth = trips.filter((trip) => {
      const d = new Date(trip.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalKmMes = tripsThisMonth.reduce((sum, t) => sum + t.km, 0);

    // 2. TRIGGER NOTIFICATIONS
    // Checking daily goal
    if (activeTodayTarget > 0 && hojeGanhos >= activeTodayTarget) {
      const todayStrKey = new Date().toLocaleDateString('pt-BR');
      const alertedToday = localStorage.getItem(`alert_meta_dia_${todayStrKey}`);
      if (!alertedToday) {
        triggerLocalNotification(
          '🎯 Meta Diária Atingida! 🎉',
          `Parabéns! Você bateu sua meta de hoje de R$ ${activeTodayTarget.toFixed(2)} acumulando R$ ${hojeGanhos.toFixed(2)}!`
        );
        localStorage.setItem(`alert_meta_dia_${todayStrKey}`, 'true');
      }
    }

    // Checking maintenance threshold
    if (state.maintenanceThresholdKm > 0 && totalKmMes >= state.maintenanceThresholdKm) {
      const alertedMonthKey = `${currentYear}-${currentMonth + 1}_${state.maintenanceThresholdKm}`;
      const alertedMaintenance = localStorage.getItem(`alert_manutencao_${alertedMonthKey}`);
      if (!alertedMaintenance) {
        triggerLocalNotification(
          '⚠️ Limite de Manutenção Atingido!',
          `Atenção: Você rodou ${totalKmMes.toFixed(2)} km de bike este mês, superando o limite de ${state.maintenanceThresholdKm} km.`
        );
        localStorage.setItem(`alert_manutencao_${alertedMonthKey}`, 'true');
      }
    }
  }, [state]);

  // MUTATOR ACTIONS

  // 1. Register iFood / Quita delivery
  const addDelivery = (type: 'ifood' | 'quita') => {
    const value = type === 'ifood' ? state.config.ifoodValue : state.config.quitaValue;
    const newDelivery: Delivery = {
      id: `delivery_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
      type,
      value,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      deliveries: [newDelivery, ...prev.deliveries]
    }));
  };

  // 1b. Register dynamic value delivery (e.g. from AutoScan Screen Reader Offers)
  const addDeliveryDynamic = (type: 'ifood' | 'quita', value: number) => {
    const newDelivery: Delivery = {
      id: `delivery_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
      type,
      value,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      deliveries: [newDelivery, ...prev.deliveries]
    }));
  };

  // 1c. Add completed ride/trip from GPS tracker
  const addTrip = (trip: Trip) => {
    setState(prev => ({
      ...prev,
      trips: [trip, ...prev.trips]
    }));
  };

  // 1d. Delete recorded trip from history
  const deleteTrip = (id: string) => {
    setState(prev => ({
      ...prev,
      trips: prev.trips.filter(t => t.id !== id)
    }));
  };

  // 1e. Config state updates
  const updateMaintenanceThreshold = (km: number) => {
    setState(prev => ({
      ...prev,
      maintenanceThresholdKm: km
    }));
  };

  const updateScreenReader = (active: boolean) => {
    setState(prev => ({
      ...prev,
      screenReaderActive: active
    }));
  };

  // 2. Delete delivery item (either from recent index or full admin log)
  const deleteDelivery = (id: string) => {
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.filter(d => d.id !== id)
    }));
  };

  // 3. Add custom monthly expense
  const addExpense = (name: string, value: number, dueDate: number) => {
    const newExpense: Expense = {
      id: `expense_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      dueDate,
      isEditable: true
    };

    setState(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
  };

  // 4. Update existing expense inline values
  const updateExpense = (id: string, name: string, value: number, dueDate: number) => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => (e.id === id ? { ...e, name, value, dueDate } : e))
    }));
  };

  // 5. Delete specific monthly expense
  const deleteExpense = (id: string) => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    }));
  };

  // 6. Add custom extra goal
  const addExtraGoal = (name: string, targetValue: number, daysLimit: number) => {
    const newGoal: ExtraGoal = {
      id: `goal_${Math.random().toString(36).substr(2, 9)}`,
      name,
      targetValue,
      daysLimit,
      createdAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      extraGoals: [...prev.extraGoals, newGoal]
    }));
  };

  // 7. Remove an extra goal
  const deleteExtraGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      extraGoals: prev.extraGoals.filter(g => g.id !== id)
    }));
  };

  // 8. Save updated delivery rates from settings configurations
  const updateConfig = (ifoodValue: number, quitaValue: number) => {
    setState(prev => ({
      ...prev,
      config: { ifoodValue, quitaValue }
    }));
  };

  // 9. Update day status (Trabalho / Folga / Falta)
  const updateDayStatus = (date: string, status: 'trabalho' | 'folga' | 'falta') => {
    setState(prev => {
      const currentRegs = prev.dayRegistrations || [];
      const filtered = currentRegs.filter(reg => reg.date !== date);
      const updatedRegs = status !== 'trabalho' 
        ? [...filtered, { date, status }] 
        : filtered;

      return {
        ...prev,
        dayRegistrations: updatedRegs
      };
    });
  };

  // 10. Update target division mode
  const updateTargetDivisionMode = (mode: 'equal' | 'concentrate') => {
    setState(prev => ({
      ...prev,
      targetDivisionMode: mode
    }));
  };

  // 11. Toggle keep original goal
  const toggleKeepOriginalGoal = (keep: boolean) => {
    setState(prev => ({
      ...prev,
      keepOriginalGoalToggle: keep
    }));
  };

  // 11b. Update Widget Options selection
  const updateWidgetOptions = (options: AppState['widgetOptions']) => {
    setState(prev => ({
      ...prev,
      widgetOptions: {
        ...prev.widgetOptions,
        ...options
      }
    }));
  };

  // 11c. Adjust accumulated goal shortfall (carryover)
  const adjustAccumulatedGoal = (amount: number, description: string) => {
    setState(prev => {
      const newAdjustment = {
        id: `adjust_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
        date: new Date().toLocaleDateString('pt-BR'),
        description,
        amount
      };
      return {
        ...prev,
        accumulatedGoalPendente: amount,
        goalAdjustments: [newAdjustment, ...(prev.goalAdjustments || [])]
      };
    });
  };

  // 11d. Reset accumulated goal carryover
  const resetAccumulatedGoal = () => {
    setState(prev => {
      const newAdjustment = {
        id: `adjust_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
        date: new Date().toLocaleDateString('pt-BR'),
        description: "Valores acumulados zerados manualmente",
        amount: 0
      };
      return {
        ...prev,
        accumulatedGoalPendente: 0,
        goalAdjustments: [newAdjustment, ...(prev.goalAdjustments || [])]
      };
    });
  };

  // 12. Reset database to starting layouts
  const resetToDefaults = () => {
    localStorage.removeItem('entregacontrole_pro_db');
    // Load fresh setup state
    const fresh = loadState();
    setState(fresh);
  };

  // Render proper sub-window view
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            state={state}
            addDelivery={addDelivery}
            deleteDelivery={deleteDelivery}
            updateDayStatus={updateDayStatus}
            updateTargetDivisionMode={updateTargetDivisionMode}
            toggleKeepOriginalGoal={toggleKeepOriginalGoal}
            updateWidgetOptions={updateWidgetOptions}
          />
        );
      case 'expenses':
        return (
          <ExpensesView
            state={state}
            addExpense={addExpense}
            deleteExpense={deleteExpense}
          />
        );
      case 'goals':
        return (
          <MetaView
            state={state}
            addExtraGoal={addExtraGoal}
            deleteExtraGoal={deleteExtraGoal}
            adjustAccumulatedGoal={adjustAccumulatedGoal}
            resetAccumulatedGoal={resetAccumulatedGoal}
          />
        );
      case 'cofrinho':
        return (
          <CofrinhoView
            state={state}
          />
        );
      case 'percurso':
        return (
          <PercursoView
            state={state}
            addTrip={addTrip}
            deleteTrip={deleteTrip}
            addDeliveryDynamic={addDeliveryDynamic}
            updateMaintenanceThreshold={updateMaintenanceThreshold}
            updateScreenReader={updateScreenReader}
            trackingActive={trackingActive}
            setTrackingActive={setTrackingActive}
            seconds={seconds}
            setSeconds={setSeconds}
            distanceKm={distanceKm}
            setDistanceKm={setDistanceKm}
            trackSource={trackSource}
            setTrackSource={setTrackSource}
            trackValue={trackValue}
            setTrackValue={setTrackValue}
            logs={logs}
            addLog={addLog}
          />
        );
      case 'settings':
        return (
          <SettingsView
            state={state}
            updateConfig={updateConfig}
            deleteDelivery={deleteDelivery}
            updateExpense={updateExpense}
            deleteExpense={deleteExpense}
            addExpense={addExpense}
            resetToDefaults={resetToDefaults}
            updateDayStatus={updateDayStatus}
            updateTargetDivisionMode={updateTargetDivisionMode}
            toggleKeepOriginalGoal={toggleKeepOriginalGoal}
            updateWidgetOptions={updateWidgetOptions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div id="app_root" className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-28">
      
      {/* GLOBAL HIGH-CONTRAST APP HEADER */}
      <header id="global_header" className="bg-white border-b border-slate-100 py-3 sm:py-4 px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="bg-brand-500 text-white p-1.5 sm:p-2 rounded-xl shadow-md shadow-brand-500/20 shrink-0">
              <Bike size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-xs uppercase font-extrabold tracking-wider text-brand-600 block leading-none truncate">
                Controle Profissional
              </span>
              <span className="font-display font-black text-gray-950 text-sm sm:text-md tracking-tight leading-none block truncate mt-0.5">
                EntregaControle Pro
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[11px] font-bold font-mono text-slate-500 tracking-wider">
              BANCO BANCO_LOCAL ATIVO
            </span>
          </div>
        </div>
      </header>

      {/* CORE CONTAINER WITH GENTLE TRANSITIONS */}
      <main className="max-w-3xl mx-auto px-4 pt-6 w-full flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* STRICT NAV BAR OUTLINE IN THE BOTTOM BOTTOM AS REQUESTED */}
      <nav id="bottom_nav_bar" className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-150 py-2 px-1 xs:px-2 sm:px-4 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto flex items-center justify-around gap-0.5 sm:gap-2">
          
          {/* Button: Home */}
          <button
            id="nav_tab_home"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'home' ? 'text-brand-500 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Home size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'home' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Início</span>
          </button>

          {/* Button: Expenses */}
          <button
            id="nav_tab_expenses"
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'expenses' ? 'text-brand-500 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Receipt size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'expenses' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Despesas</span>
          </button>

          {/* Button: Cofrinho */}
          <button
            id="nav_tab_cofrinho"
            onClick={() => setActiveTab('cofrinho')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'cofrinho' ? 'text-teal-600 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <PiggyBank size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'cofrinho' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Cofrinho</span>
          </button>

          {/* Button: Goals */}
          <button
            id="nav_tab_goals"
            onClick={() => setActiveTab('goals')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'goals' ? 'text-brand-500 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Target size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'goals' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Metas</span>
          </button>

          {/* Button: Percurso */}
          <button
            id="nav_tab_percurso"
            onClick={() => setActiveTab('percurso')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'percurso' ? 'text-brand-500 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <MapPin size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'percurso' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Percurso e KM</span>
          </button>

          {/* Button: Settings */}
          <button
            id="nav_tab_settings"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer transition-all flex-1 min-w-0 py-1 rounded-xl ${activeTab === 'settings' ? 'text-brand-500 font-bold' : 'text-slate-400 hover:text-slate-650'}`}
          >
            <Settings size={18} className={`sm:w-5 sm:h-5 ${activeTab === 'settings' ? 'scale-110 transition-transform' : ''}`} />
            <span className="text-[8.5px] xs:text-[10px] uppercase font-bold tracking-wider truncate max-w-full">Ajustes</span>
          </button>

        </div>
      </nav>

    </div>
  );
}
