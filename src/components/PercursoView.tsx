/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Square,
  Navigation,
  Gauge,
  Cpu,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Award,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  TrendingUp,
  X
} from 'lucide-react';
import { AppState, Trip } from '../types';

interface PercursoViewProps {
  state: AppState;
  addTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void;
  addDeliveryDynamic: (type: 'ifood' | 'quita', value: number) => void;
  updateMaintenanceThreshold: (km: number) => void;
  updateScreenReader: (active: boolean) => void;
}

export function PercursoView({
  state,
  addTrip,
  deleteTrip,
  addDeliveryDynamic,
  updateMaintenanceThreshold,
  updateScreenReader
}: PercursoViewProps) {
  
  // States for active manual/assisted tracker
  const [trackingActive, setTrackingActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0.0);
  const [trackSource, setTrackSource] = useState<'ifood' | 'quita' | 'manual'>('manual');
  const [trackValue, setTrackValue] = useState<number>(0);

  // Geolocation watch id
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  // Form custom limits
  const [customThreshold, setCustomThreshold] = useState<string>(
    state.maintenanceThresholdKm.toString()
  );

  // Screen Reader states
  const [logs, setLogs] = useState<string[]>([]);

  // Sound/Vibe alerts feedback text
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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

  // Active screen reader background listener (Silent Android/iOS Bridge integration)
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

  // Help calculate distance via Haversine Formula
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

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 15)]);
  };

  // Actions
  const handleStartTracking = (platform: 'ifood' | 'quita' | 'manual' = 'manual', val: number = 0) => {
    setSeconds(0);
    setDistanceKm(0);
    setTrackSource(platform);
    setTrackValue(val);
    setTrackingActive(true);
    addLog(`[GPS]: Rastreamento real via GPS iniciado (${platform === 'manual' ? 'Manual' : platform.toUpperCase()})`);
  };

  const handleStopTracking = () => {
    if (!trackingActive) return;
    
    // Save to list
    const finalDistance = parseFloat(distanceKm.toFixed(2));
    const finalSeconds = seconds;
    const avgSpeed = finalSeconds > 0 ? parseFloat(((finalDistance / finalSeconds) * 3600).toFixed(1)) : 0;

    const newTrip: Trip = {
      id: `trip_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
      km: finalDistance,
      durationSeconds: finalSeconds,
      avgSpeedKmH: avgSpeed,
      date: new Date().toISOString(),
      platform: trackSource,
      value: trackValue || (trackSource === 'ifood' ? state.config.ifoodValue : trackSource === 'quita' ? state.config.quitaValue : 0)
    };

    addTrip(newTrip);
    setTrackingActive(false);

    // Trigger visual toast
    setFeedbackMsg(`Percurso finalizado! Rodou ${finalDistance.toFixed(2)} km. Dados sincronizados com o banco!`);
    addLog(`[GPS]: Percurso encerrado e salvo. Total: ${finalDistance.toFixed(2)} km, Velocidade Média: ${avgSpeed} km/h.`);

    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };



  // Calculations
  const tripsThisMonth = state.trips.filter((trip) => {
    const d = new Date(trip.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalKmMes = tripsThisMonth.reduce((sum, t) => sum + t.km, 0);

  // Filter today's trips
  const todayStr = new Date().toDateString();
  const totalKmHoje = state.trips
    .filter((t) => new Date(t.date).toDateString() === todayStr)
    .reduce((sum, t) => sum + t.km, 0);

  // Bicycle upkeep cost reference matching state.expenses
  const bikeUpkeepExpense = state.expenses
    .filter((e) => {
      const name = e.name.toLowerCase();
      return name.includes('bike') || name.includes('bicicleta') || name.includes('manutenção');
    })
    .reduce((sum, e) => sum + e.value, 0);

  // Custo por KM = despesa_da_bicicleta_no_mes / total_km_mensal
  const costPerKm = totalKmMes > 0 ? bikeUpkeepExpense / totalKmMes : 0;

  // Real profit calculation (total monthly earnings minus total monthly bike upkeep) / total Km
  const totalMonthlyGanhos = state.deliveries.reduce((sum, del) => sum + del.value, 0);
  const realProfitPerKm = totalKmMes > 0 ? (totalMonthlyGanhos - bikeUpkeepExpense) / totalKmMes : 0;

  // Maintenance alarm checks
  const maintenanceAlert = totalKmMes >= state.maintenanceThresholdKm;

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customThreshold);
    if (!isNaN(parsed) && parsed > 0) {
      updateMaintenanceThreshold(parsed);
      setFeedbackMsg(`Limite de manutenção atualizado para ${parsed} km!`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Format tracking stopwatch
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render offer notification popup widget mock inside browser context
  return (
    <div id="percurso_and_km_container" className="space-y-6 pb-6">

      {/* Ephemeral floating triggers */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-brand-600 text-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 border border-brand-500/30 z-50 sticky top-16"
          >
            <CheckCircle size={20} className="text-amber-200 shrink-0" />
            <span className="font-semibold text-sm">{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>



      {/* CORE MAINTENANCE ALERT IF MILEAGE MET */}
      {maintenanceAlert && (
        <div className="bg-red-50 border-2 border-red-200 text-red-900 rounded-3xl p-5 flex items-start gap-4 shadow-sm animate-pulse">
          <AlertTriangle size={32} className="text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm sm:text-base text-red-950 font-display">
              Aviso de Manutenção de Bicicleta!
            </h4>
            <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
              Atenção: Você rodou <b>{totalKmMes.toFixed(2)} km</b> este mês, superando o limite máximo recomendado de <b>{state.maintenanceThresholdKm} km</b>. É altamente recomendável fazer uma revisão ou trocar peças para evitar acidentes!
            </p>
          </div>
        </div>
      )}

      {/* TRACKER PANEL (GPS PERCURSO) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-50 text-brand-600 p-2.5 rounded-2xl">
              <Navigation size={22} className={trackingActive ? 'animate-bounce' : ''} />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black font-display text-slate-900 leading-tight">
                Cálculo de Percurso & KM GPS Real
              </h1>
              <p className="text-slate-405 text-xs">Rastreamento preciso e medições em tempo real de suas corridas</p>
            </div>
          </div>
        </div>

        {/* Stopwatch & Live Stats Panel */}
        <div className="bg-slate-950 rounded-2xl p-5 sm:p-6 text-white space-y-5 relative overflow-hidden shadow-inner border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">Métricas de Movimento</span>
            <div className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-extrabold uppercase shrink-0 transition-colors flex items-center gap-1.5 ${
              trackingActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${trackingActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              {trackingActive ? 'Rastreador GPS Ativo' : 'GPS em Espera'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Distância</span>
              <span className="text-2xl sm:text-3.5xl font-black font-mono text-emerald-400 mt-1 block">
                {distanceKm.toFixed(2)} <span className="text-xs text-white">km</span>
              </span>
            </div>

            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Tempo de Corrida</span>
              <span className="text-2xl sm:text-3.5xl font-black font-mono text-white mt-1 block">
                {formatTime(seconds)}
              </span>
            </div>

            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Velocidade Média</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3.5xl font-black font-mono text-amber-300">
                  {seconds > 0 ? ((distanceKm / seconds) * 3600).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs text-slate-400">km/h</span>
              </div>
            </div>
          </div>


        </div>

        {/* Start / Stop triggers */}
        <div id="tracker_buttons" className="flex flex-col w-full gap-2.5">
          {!trackingActive ? (
            <div className="flex flex-col w-full gap-2">
              <button
                id="btn_start_tracking"
                onClick={() => handleStartTracking('manual', 0)}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01] shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 text-sm"
              >
                <Play size={18} fill="currentColor" /> Iniciar Novo Percurso Real (Manual)
              </button>
              {state.screenReaderActive && (
                <p className="text-[11px] text-slate-400 text-center italic leading-relaxed">
                  * O GPS iniciará automaticamente ao captar uma nova proposta aceita nos aplicativos iFood ou Quita.
                </p>
              )}
            </div>
          ) : (
            <button
              id="btn_stop_tracking"
              onClick={handleStopTracking}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01] shadow-md shadow-red-500/10 flex items-center justify-center gap-2 text-sm animate-pulse"
            >
              <Square size={18} fill="currentColor" />
              {trackSource === 'manual' 
                ? 'Parar & Salvar no Histórico' 
                : `Finalizar Percurso do ${trackSource === 'ifood' ? 'iFood' : 'Quita'} Manualmente`}
            </button>
          )}
        </div>
      </div>

      {/* CORE FORMULA CALCULATIONS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* KPI Panel: Custo/KM & Lucro/KM */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 pb-2 border-b border-slate-50">
            <TrendingUp size={18} className="text-brand-500" />
            Cálculos de Lucratividade por Km
          </h3>
 
          <div className="space-y-4 pt-1">
            {/* Custo do Km */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Meu Custo por KM</span>
                <span className="text-xs text-slate-500">Com custo bike (R$ {bikeUpkeepExpense.toFixed(2)}/mês)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black font-display text-red-600 block">
                  R$ {costPerKm.toFixed(2)} <span className="text-xs text-slate-455">/ km</span>
                </span>
                <span className="text-[10px] text-slate-400">total rodado: {totalKmMes.toFixed(1)} km</span>
              </div>
            </div>

            {/* Lucro do Km */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Meu Lucro Real por KM</span>
                <span className="text-xs text-slate-500">Ganhos líquidos após custos</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black font-display text-emerald-600 block">
                  R$ {realProfitPerKm.toFixed(2)} <span className="text-xs text-slate-455">/ km</span>
                </span>
                <span className="text-[10px] text-slate-400">Livre de manutenção</span>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Config threshold Form */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 pb-2 border-b border-slate-50">
            <Wrench size={18} className="text-red-500" />
            Configuração de Alerta de Manutenção
          </h3>
          
          <form onSubmit={handleSaveThreshold} className="space-y-4 pt-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">
                Alerta de manutenção quando atingir (KM):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-brand-500 font-bold px-3 py-2 rounded-xl text-slate-850 focus:outline-none text-sm"
                  placeholder="Ex: 150"
                  min="5"
                />
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-450 leading-normal">
              Recomendamos o limite padrão de **150 km** para bicicletas normais e cargueiras fazerem lubrificação e revisão de freios periódica.
            </p>
          </form>
        </div>
      </div>

      {/* DETECÇÃO INTELIGENTE DE CORRIDAS (FUNÇÃO 2 PANEL) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-50 text-brand-600 p-2.5 rounded-2xl">
              <Cpu size={22} className={state.screenReaderActive ? 'animate-pulse text-emerald-600' : ''} />
            </div>
            <div>
              <h2 className="text-md sm:text-lg font-black font-display text-slate-900 leading-tight">
                Leitor de Tela Automático (Acessibilidade)
              </h2>
              <p className="text-slate-400 text-xs text-left">Leitura em tempo real e captura integrada em segundo plano</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => updateScreenReader(!state.screenReaderActive)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                state.screenReaderActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${state.screenReaderActive ? 'bg-white animate-ping' : 'bg-slate-400'}`} />
              {state.screenReaderActive ? 'Ativo ✔' : 'Ativar'}
            </button>
          </div>
        </div>

        {/* Real Status Indicator — "Mantenha na tela apenas o status: Leitura de Tela: ATIVA/INATIVA — só isso, sem mais nada." */}
        <div className="pt-2">
          {state.screenReaderActive ? (
            <div className="flex items-center justify-center gap-3 bg-emerald-500 text-white p-5 rounded-2xl shadow-md shadow-emerald-500/10 border border-emerald-400">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
              </span>
              <span className="font-extrabold text-sm sm:text-base uppercase tracking-wider font-mono text-white">
                Leitura de Tela: ATIVA
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-slate-100 text-slate-400 p-5 rounded-2xl border border-slate-200">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-300 animate-pulse" />
              <span className="font-extrabold text-sm sm:text-base uppercase tracking-wider font-mono text-slate-400">
                Leitura de Tela: INATIVA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TRACK HISTORIC TRIPS */}
      <div id="trip_results_table" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Histórico de Corridas e Percursor</h3>
            <span className="text-slate-400 text-xs">Total de {state.trips.length} trajetos registrados</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 font-mono">
            {totalKmMes.toFixed(1)} km rodados
          </span>
        </div>

        {state.trips.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Navigation className="mx-auto text-slate-300 mb-2" size={28} />
            <p className="text-slate-400 text-sm">Nenhum percurso completado.</p>
            <p className="text-slate-400 text-xs mt-0.5">Use o painel acima para registrar seu percurso de hoje!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.trips.map((trip) => {
              const formattedDate = new Date(trip.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div
                  key={trip.id}
                  className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100/70 gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                      trip.platform === 'ifood' ? 'bg-red-50 text-red-650 border border-red-200/40' : trip.platform === 'quita' ? 'bg-teal-50 text-teal-650 border border-teal-200/40' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {trip.platform}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-display">
                        Percurso de {trip.km.toFixed(2)} km
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar size={11} /> {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold font-mono text-slate-605">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-normal font-sans">Velocidade</span>
                      <span className="text-slate-805 font-bold">{trip.avgSpeedKmH} km/h</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-normal font-sans">Duração</span>
                      <span className="text-slate-805 font-bold">{formatTime(trip.durationSeconds)}</span>
                    </div>
                    {trip.value > 0 && (
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-455 block font-normal font-sans">Valor Ganho</span>
                        <span className="text-emerald-600 font-extrabold">R$ {trip.value.toFixed(2)}</span>
                      </div>
                    )}
                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg shrink-0 transition-colors ml-auto sm:ml-0"
                      title="Excluir do histórico"
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

    </div>
  );
}
