/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  TrendingUp, 
  Percent, 
  Users, 
  Download, 
  RefreshCw, 
  Lock, 
  LogOut, 
  AlertTriangle, 
  FileText, 
  BarChart3, 
  HelpCircle, 
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Clock,
  Gauge
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Linear Congruential Generator for Reproducible Stochastic Simulations (Coss Bu)
class LCG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

// Full Configurable Parameter structure conforming to Section 6.2.1
interface SimulationConfig {
  precioSubvencionado: number;
  precioInternacional: number;
  incrementoTrimestral: number;
  numSurtidoresSubv: number;
  capacidadTanque: number;
  umbralAbastecimiento: number;
  intervaloAbastecimiento: number;
  tiempoLimite: number;
  maxVehiculos: number;
  lambdaLlegadas: number;
  useFixedSeed: boolean;
  semilla: number;
  
  // Opportunity Cost parameters for each profile (triangular: a=base, b=moda, c=max)
  tpCostoOpBase: number;
  tpCostoOpModa: number;
  tpCostoOpMax: number;

  mpCostoOpBase: number;
  mpCostoOpModa: number;
  mpCostoOpMax: number;

  apCostoOpBase: number;
  apCostoOpModa: number;
  apCostoOpMax: number;

  moCostoOpBase: number;
  moCostoOpModa: number;
  moCostoOpMax: number;

  cmCostoOpBase: number;
  cmCostoOpModa: number;
  cmCostoOpMax: number;

  otCostoOpBase: number;
  otCostoOpModa: number;
  otCostoOpMax: number;
}

interface VehiculoType {
  id: number;
  tipo: string;
  volumen: number;
  tiempoServicio: number;
  costoOportunidad: number;
  horaLlegada: number;
  rutaElegida: string;
  esperaProyectadaSubv?: number;
  costoSubv?: number;
  costoInt?: number;
  horaInicioCarga?: number;
  horaFinCarga?: number;
}

interface Evento {
  tiempo: number;
  tipo: 'INICIO' | 'LLEGADA' | 'FIN_CARGA' | 'ABASTECIMIENTO';
  idSurtidor: number;
  idVehiculo: number;
  observaciones: string;
  vehiculoDetalle?: VehiculoType;
}

// Default Configuration values from Section 6.2.2 of Fase 4 PDF
const DEFAULT_CONFIG: SimulationConfig = {
  precioSubvencionado: 6.96,
  precioInternacional: 12.50,
  incrementoTrimestral: 1.35, // Fase 4 specification
  numSurtidoresSubv: 4,
  capacidadTanque: 10000,
  umbralAbastecimiento: 500,
  intervaloAbastecimiento: 240, // 4 hours
  tiempoLimite: 480, // 8 hours turn
  maxVehiculos: 1000,
  lambdaLlegadas: 0.3425,
  useFixedSeed: true,
  semilla: 12345,

  // Costo de oportunidad base, moda and max per vehicle profile (triangular)
  tpCostoOpBase: 2.5,
  tpCostoOpModa: 3.5,
  tpCostoOpMax: 4.0,

  mpCostoOpBase: 0.8,
  mpCostoOpModa: 1.2,
  mpCostoOpMax: 1.7,

  apCostoOpBase: 0.3,
  apCostoOpModa: 0.5,
  apCostoOpMax: 0.8,

  moCostoOpBase: 0.2,
  moCostoOpModa: 0.3,
  moCostoOpMax: 0.5,

  cmCostoOpBase: 1.5,
  cmCostoOpModa: 2.0,
  cmCostoOpMax: 2.5,

  otCostoOpBase: 2.0,
  otCostoOpModa: 3.0,
  otCostoOpMax: 4.0
};

export default function App() {
  // Authentication State (Spring Security & JWT setup simulation)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [jwtToken, setJwtToken] = useState('');

  // Simulation Parameters & Selected detail row
  const [config, setConfig] = useState<SimulationConfig>({ ...DEFAULT_CONFIG });
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  
  // Vaadin Binder State simulation tracker
  const [binderLog, setBinderLog] = useState<string>('Vaadin Binder: Bound with SimulationConfig (Active JWT).');
  const [binderToast, setBinderToast] = useState<boolean>(false);

  // Active analytical visual chart tab
  const [activeChartTab, setActiveChartTab] = useState<'cola' | 'combustible' | 'decision' | 'espera'>('cola');

  // Stochastic simulation run
  const simulationResults = useMemo(() => {
    let rng = config.useFixedSeed ? new LCG(config.semilla) : { next: () => Math.random() };

    let reloj = 0.0;
    let nivelCombustible = config.capacidadTanque;

    // Surtidores: S1 to S4 Subv, S5 Int
    let surtidores: { id: number; ocupado: boolean; tiempoFinServicio: number; tipo: 'SUBV' | 'INT' }[] = Array.from({ length: config.numSurtidoresSubv }, (_, i) => ({
      id: i + 1,
      ocupado: false,
      tiempoFinServicio: 0.0,
      tipo: 'SUBV' as const
    }));
    surtidores.push({ id: 5, ocupado: false, tiempoFinServicio: 0.0, tipo: 'INT' as const });

    let calendario: Evento[] = [];
    const addEventoCalendar = (ev: Evento) => {
      calendario.push(ev);
      calendario.sort((a, b) => a.tiempo - b.tiempo);
    };

    let colaSubv: VehiculoType[] = [];
    let colaInt: VehiculoType[] = [];

    let eventosHistoricos: Evento[] = [];
    let vehiculosAtendidosMap = new Map<number, VehiculoType>();
    
    let totalVehiculosAtendidos = 0;
    let totalVehiculosRedirigidos = 0;
    let totalVehiculosPerdidosCombustible = 0;

    let sumaTiemposEspera = 0.0;
    let sumaTiemposServicio = 0.0;
    let areaColaSubv = 0.0;

    // Series variables for the 5 visual charts conforming to Table 6.2
    let queueHistoryData: { tiempo: number; Qs: number; Qi: number }[] = [];
    let fuelSawtoothData: { tiempo: number; N: number }[] = [];
    let waitTimesList: number[] = [];
    let decisionScatterData: { id: number; tipo: string; costoSubv: number; costoInt: number; ruta: string }[] = [];

    // Pump analytical performance tracking
    let tiempoOcupadoSurtidores = Array(6).fill(0);
    let ultimoCambioSurtidor = Array(6).fill(0);
    let vehiculosAtendidosPorSurtidor = Array(6).fill(0);

    // Initial LCG Arrivals scheduling
    let r1 = rng.next();
    let tiempoLlegada = - (1.0 / config.lambdaLlegadas) * Math.log(r1);
    addEventoCalendar({
      tiempo: tiempoLlegada,
      tipo: 'LLEGADA',
      idSurtidor: 0,
      idVehiculo: 1,
      observaciones: 'Primera llegada de vehículo programada exponencialmente.'
    });

    addEventoCalendar({
      tiempo: config.intervaloAbastecimiento,
      tipo: 'ABASTECIMIENTO',
      idSurtidor: 0,
      idVehiculo: 0,
      observaciones: 'Abastecimiento de combustible periódico programado de fábrica.'
    });

    eventosHistoricos.push({
      tiempo: 0.0,
      tipo: 'INICIO',
      idSurtidor: 0,
      idVehiculo: 0,
      observaciones: `Estación iniciada. Surtidores subvencionados activos: ${config.numSurtidoresSubv}. Nivel tanque inicial: ${config.capacidadTanque}L.`
    });

    fuelSawtoothData.push({ tiempo: 0.0, N: config.capacidadTanque });

    let idVehiculoContador = 1;
    const maxEventsStored = config.maxVehiculos > 3000 ? 3000 : config.maxVehiculos;

    while (calendario.length > 0 && reloj < config.tiempoLimite && totalVehiculosAtendidos < config.maxVehiculos) {
      let proximoEvento = calendario.shift()!;
      let tiempoAnterior = reloj;
      reloj = proximoEvento.tiempo;
      if (reloj >= config.tiempoLimite) break;

      // Queue state area integration
      areaColaSubv += colaSubv.length * (reloj - tiempoAnterior);

      // Track pump active occupation times
      surtidores.forEach(s => {
        if (s.ocupado) {
          tiempoOcupadoSurtidores[s.id] += (reloj - ultimoCambioSurtidor[s.id]);
        }
        ultimoCambioSurtidor[s.id] = reloj;
      });

      switch (proximoEvento.tipo) {
        case 'LLEGADA': {
          let rType = rng.next();
          let tipoVehiculo = '';
          if (rType < 0.2339) tipoVehiculo = "Transporte Pesado";
          else if (rType < 0.4920) tipoVehiculo = "Minibus Publico";
          else if (rType < 0.6372) tipoVehiculo = "Auto Particular";
          else if (rType < 0.7582) tipoVehiculo = "Motocicleta";
          else if (rType < 0.8308) tipoVehiculo = "Volqueta";
          else if (rType < 0.8792) tipoVehiculo = "Flota Interdepartamental";
          else if (rType < 0.9357) tipoVehiculo = "Cisterna (Sistema)";
          else tipoVehiculo = "Camion Mediano";

          let rVol = rng.next();
          let volumen = 0;
          switch (tipoVehiculo) {
            case "Transporte Pesado": volumen = 280.0 + rVol * (400.0 - 280.0); break;
            case "Minibus Publico": volumen = 40.0 + rVol * (49.0 - 40.0); break;
            case "Auto Particular": volumen = 35.0 + rVol * (45.0 - 35.0); break;
            case "Motocicleta": volumen = 7.0 + rVol * (10.0 - 7.0); break;
            case "Volqueta": volumen = 170.0 + rVol * (210.0 - 170.0); break;
            case "Flota Interdepartamental": volumen = 260.0 + rVol * (300.0 - 260.0); break;
            case "Cisterna (Sistema)": volumen = 280.0 + rVol * (350.0 - 280.0); break;
            default: volumen = 85.0 + rVol * (110.0 - 85.0); break; // Camion Mediano
          }

          let rServ = rng.next();
          let tiempoServicio = 0;
          switch (tipoVehiculo) {
            case "Transporte Pesado": tiempoServicio = 8.38 + rServ * (11.51 - 8.38); break;
            case "Minibus Publico": tiempoServicio = 3.12 + rServ * (3.60 - 3.12); break;
            case "Auto Particular": tiempoServicio = 3.04 + rServ * (3.50 - 3.04); break;
            case "Motocicleta": tiempoServicio = 1.44 + rServ * (1.55 - 1.44); break;
            case "Volqueta": tiempoServicio = 5.42 + rServ * (6.33 - 5.42); break;
            case "Flota Interdepartamental": tiempoServicio = 8.19 + rServ * (9.18 - 8.19); break;
            case "Cisterna (Sistema)": tiempoServicio = 8.35 + rServ * (10.34 - 8.35); break;
            default: tiempoServicio = 4.21 + rServ * (4.75 - 4.21); break; // Camion Mediano
          }

          let rCost = rng.next();
          let costoOportunidad = 0;
          let a = 0, b = 0, c = 0;
          
          // Cost of opportunity bounds customized by total parameterization panel
          switch (tipoVehiculo) {
            case "Transporte Pesado":
              a = config.tpCostoOpBase; b = config.tpCostoOpModa; c = config.tpCostoOpMax;
              break;
            case "Minibus Publico":
              a = config.mpCostoOpBase; b = config.mpCostoOpModa; c = config.mpCostoOpMax;
              break;
            case "Auto Particular":
              a = config.apCostoOpBase; b = config.apCostoOpModa; c = config.apCostoOpMax;
              break;
            case "Motocicleta":
              a = config.moCostoOpBase; b = config.moCostoOpModa; c = config.moCostoOpMax;
              break;
            case "Camion Mediano":
              a = config.cmCostoOpBase; b = config.cmCostoOpModa; c = config.cmCostoOpMax;
              break;
            default: // Cisterna, Volqueta, Flota (Otros)
              a = config.otCostoOpBase; b = config.otCostoOpModa; c = config.otCostoOpMax;
              break;
          }

          let p = (b - a) / (c - a);
          if (rCost <= p) {
            costoOportunidad = a + Math.sqrt(rCost * (b - a) * (c - a));
          } else {
            costoOportunidad = c - Math.sqrt((1.0 - rCost) * (c - b) * (c - a));
          }

          let veh: VehiculoType = {
            id: idVehiculoContador++,
            tipo: tipoVehiculo,
            volumen,
            tiempoServicio,
            costoOportunidad,
            horaLlegada: reloj,
            rutaElegida: ''
          };

          // Fuel validation
          if (nivelCombustible < volumen) {
            totalVehiculosPerdidosCombustible++;
            proximoEvento.observaciones = `Rechazado por combustible insuficiente. Requerido: ${volumen.toFixed(1)}L, Disponible: ${nivelCombustible.toFixed(1)}L.`;
            proximoEvento.vehiculoDetalle = { ...veh, rutaElegida: 'RECHAZADO' };
            
            if (eventosHistoricos.length < maxEventsStored) {
              eventosHistoricos.push(proximoEvento);
            }

            // Schedule immediate emergency replenishment
            let hasAbast = calendario.some(e => e.tipo === 'ABASTECIMIENTO');
            if (!hasAbast) {
              addEventoCalendar({
                tiempo: reloj + 5.0,
                tipo: 'ABASTECIMIENTO',
                idSurtidor: 0,
                idVehiculo: 0,
                observaciones: 'Abastecimiento urgente de emergencia (cisterna arriba en 5 min).'
              });
            }

            // Schedule next arrival
            let rNext = rng.next();
            let tNext = reloj - (1.0 / config.lambdaLlegadas) * Math.log(rNext);
            addEventoCalendar({
              tiempo: tNext,
              tipo: 'LLEGADA',
              idSurtidor: 0,
              idVehiculo: idVehiculoContador,
              observaciones: 'Llegada programada exponencialmente.'
            });
            break;
          }

          // Economic decision formulation (Coss Bu)
          let esperaProyectadaSubv = (colaSubv.length + 1) * (sumaTiemposServicio / Math.max(1, totalVehiculosAtendidos));
          let costoSubv = (volumen * config.precioSubvencionado) + (esperaProyectadaSubv * costoOportunidad);
          let costoInt = (volumen * config.precioInternacional) + (0.0 * costoOportunidad); // wait is zero in international pump

          veh.esperaProyectadaSubv = esperaProyectadaSubv;
          veh.costoSubv = costoSubv;
          veh.costoInt = costoInt;

          // Record Cost Comparison for Scatter Plot
          if (decisionScatterData.length < 200) {
            decisionScatterData.push({
              id: veh.id,
              tipo: veh.tipo,
              costoSubv: parseFloat(costoSubv.toFixed(2)),
              costoInt: parseFloat(costoInt.toFixed(2)),
              ruta: costoSubv < costoInt ? 'SUBV' : 'INT'
            });
          }

          let obs = '';
          if (costoSubv < costoInt) {
            veh.rutaElegida = 'SUBV';
            obs = `Elige SUBV (${costoSubv.toFixed(1)} Bs < ${costoInt.toFixed(1)} Bs). `;

            let surtidorLibre = surtidores.slice(0, config.numSurtidoresSubv).find(s => !s.ocupado);
            if (surtidorLibre) {
              surtidorLibre.ocupado = true;
              surtidorLibre.tiempoFinServicio = reloj + tiempoServicio;
              veh.horaInicioCarga = reloj;
              
              addEventoCalendar({
                tiempo: reloj + tiempoServicio,
                tipo: 'FIN_CARGA',
                idSurtidor: surtidorLibre.id,
                idVehiculo: veh.id,
                observaciones: `Carga finalizada de V-${veh.id} en Surtidor Subvencionado ${surtidorLibre.id}.`
              });

              totalVehiculosAtendidos++;
              vehiculosAtendidosPorSurtidor[surtidorLibre.id]++;
              sumaTiemposServicio += tiempoServicio;
              vehiculosAtendidosMap.set(veh.id, veh);
              obs += `Atendido en Surtidor ${surtidorLibre.id}.`;
            } else {
              colaSubv.push(veh);
              obs += `Surtidores ocupados. Entra en Cola Subvencionada (Posición: ${colaSubv.length}).`;
            }
          } else {
            veh.rutaElegida = 'INT';
            totalVehiculosRedirigidos++;
            obs = `Elige INTERNACIONAL (${costoInt.toFixed(1)} Bs <= ${costoSubv.toFixed(1)} Bs). `;

            let s5 = surtidores[surtidores.length - 1]; // Surtidor 5 INT
            if (!s5.ocupado) {
              s5.ocupado = true;
              s5.tiempoFinServicio = reloj + tiempoServicio;
              veh.horaInicioCarga = reloj;

              addEventoCalendar({
                tiempo: reloj + tiempoServicio,
                tipo: 'FIN_CARGA',
                idSurtidor: 5,
                idVehiculo: veh.id,
                observaciones: `Carga finalizada de V-${veh.id} en Surtidor Internacional 5.`
              });

              totalVehiculosAtendidos++;
              vehiculosAtendidosPorSurtidor[5]++;
              sumaTiemposServicio += tiempoServicio;
              vehiculosAtendidosMap.set(veh.id, veh);
              obs += `Atendido en Surtidor Internacional 5.`;
            } else {
              colaInt.push(veh);
              obs += `Surtidor Internacional ocupado. Entra en Cola Internacional (Posición: ${colaInt.length}).`;
            }
          }

          nivelCombustible -= volumen;
          fuelSawtoothData.push({ tiempo: parseFloat(reloj.toFixed(2)), N: parseFloat(nivelCombustible.toFixed(1)) });

          proximoEvento.observaciones = obs;
          proximoEvento.vehiculoDetalle = { ...veh };

          if (eventosHistoricos.length < maxEventsStored) {
            eventosHistoricos.push(proximoEvento);
          }

          // Schedule next arrival
          let rNext = rng.next();
          let tNext = reloj - (1.0 / config.lambdaLlegadas) * Math.log(rNext);
          addEventoCalendar({
            tiempo: tNext,
            tipo: 'LLEGADA',
            idSurtidor: 0,
            idVehiculo: idVehiculoContador,
            observaciones: 'Llegada programada exponencialmente.'
          });
          break;
        }

        case 'FIN_CARGA': {
          let s = surtidores.find(s => s.id === proximoEvento.idSurtidor)!;
          s.ocupado = false;

          let veh = vehiculosAtendidosMap.get(proximoEvento.idVehiculo);
          let waitTime = 0.0;
          if (veh) {
            veh.horaFinCarga = reloj;
            waitTime = veh.horaInicioCarga! - veh.horaLlegada;
            sumaTiemposEspera += waitTime;
            waitTimesList.push(waitTime);
          }

          let finObs = `Surtidor ${s.id} liberado. Vehículo V-${proximoEvento.idVehiculo} se retira. Espera: ${waitTime.toFixed(1)} min.`;

          if (s.tipo === 'SUBV') {
            if (colaSubv.length > 0) {
              let nextVeh = colaSubv.shift()!;
              nextVeh.horaInicioCarga = reloj;
              s.ocupado = true;
              s.tiempoFinServicio = reloj + nextVeh.tiempoServicio;

              addEventoCalendar({
                tiempo: reloj + nextVeh.tiempoServicio,
                tipo: 'FIN_CARGA',
                idSurtidor: s.id,
                idVehiculo: nextVeh.id,
                observaciones: `Carga finalizada de V-${nextVeh.id} en Surtidor ${s.id}.`
              });

              totalVehiculosAtendidos++;
              vehiculosAtendidosPorSurtidor[s.id]++;
              sumaTiemposServicio += nextVeh.tiempoServicio;
              vehiculosAtendidosMap.set(nextVeh.id, nextVeh);
              finObs += ` Desencola V-${nextVeh.id} para iniciar servicio.`;
            }
          } else {
            if (colaInt.length > 0) {
              let nextVeh = colaInt.shift()!;
              nextVeh.horaInicioCarga = reloj;
              s.ocupado = true;
              s.tiempoFinServicio = reloj + nextVeh.tiempoServicio;

              addEventoCalendar({
                tiempo: reloj + nextVeh.tiempoServicio,
                tipo: 'FIN_CARGA',
                idSurtidor: 5,
                idVehiculo: nextVeh.id,
                observaciones: `Carga finalizada de V-${nextVeh.id} en Surtidor Internacional 5.`
              });

              totalVehiculosAtendidos++;
              vehiculosAtendidosPorSurtidor[5]++;
              sumaTiemposServicio += nextVeh.tiempoServicio;
              vehiculosAtendidosMap.set(nextVeh.id, nextVeh);
              finObs += ` Desencola V-${nextVeh.id} para iniciar servicio.`;
            }
          }

          proximoEvento.observaciones = finObs;
          proximoEvento.vehiculoDetalle = veh ? { ...veh } : undefined;

          if (eventosHistoricos.length < maxEventsStored) {
            eventosHistoricos.push(proximoEvento);
          }
          break;
        }

        case 'ABASTECIMIENTO': {
          nivelCombustible = config.capacidadTanque;
          proximoEvento.observaciones = `Tanque reabastecido al 100% (${config.capacidadTanque}L) por el camión cisterna.`;
          
          fuelSawtoothData.push({ tiempo: parseFloat(reloj.toFixed(2)), N: parseFloat(nivelCombustible.toFixed(1)) });

          if (eventosHistoricos.length < maxEventsStored) {
            eventosHistoricos.push(proximoEvento);
          }

          addEventoCalendar({
            tiempo: reloj + config.intervaloAbastecimiento,
            tipo: 'ABASTECIMIENTO',
            idSurtidor: 0,
            idVehiculo: 0,
            observaciones: 'Siguiente abastecimiento periódico de fábrica.'
          });
          break;
        }
      }

      // Record queue lengths for visual analytics
      if (queueHistoryData.length < 500) {
        queueHistoryData.push({
          tiempo: parseFloat(reloj.toFixed(2)),
          Qs: colaSubv.length,
          Qi: colaInt.length
        });
      }
    }

    // Finalize active times of surtidores
    surtidores.forEach(s => {
      if (s.ocupado) {
        tiempoOcupadoSurtidores[s.id] += (reloj - ultimoCambioSurtidor[s.id]);
      }
    });

    // Final analytical calculations
    let tEsperaPromedio = totalVehiculosAtendidos > 0 ? (sumaTiemposEspera / totalVehiculosAtendidos) : 0;
    let tServicioPromedio = totalVehiculosAtendidos > 0 ? (sumaTiemposServicio / totalVehiculosAtendidos) : 0;

    // Financial revenue and macroeconomic opportunity cost calculation
    let totalFuelRevenue = 0;
    let totalOpportunityCosts = 0;
    vehiculosAtendidosMap.forEach(v => {
      let tariff = v.rutaElegida === 'SUBV' ? config.precioSubvencionado : config.precioInternacional;
      totalFuelRevenue += v.volumen * tariff;
      totalOpportunityCosts += (v.horaInicioCarga! - v.horaLlegada) * v.costoOportunidad;
    });

    // Pump utilization percentages
    let utilizations = surtidores.map(s => {
      let active = tiempoOcupadoSurtidores[s.id];
      let rate = reloj > 0 ? (active / reloj) * 100 : 0;
      let utilRate = parseFloat(Math.min(rate, 100).toFixed(1));
      return {
        id: s.id,
        name: `Surtidor ${s.id}`,
        util: utilRate,
        ocioso: parseFloat((100 - utilRate).toFixed(1)),
        tipo: s.tipo,
        atendidos: vehiculosAtendidosPorSurtidor[s.id]
      };
    });

    // Histogram binning for wait times
    let waitBuckets = [
      { range: '0-2 min', count: 0 },
      { range: '2-5 min', count: 0 },
      { range: '5-10 min', count: 0 },
      { range: '10-20 min', count: 0 },
      { range: '20+ min', count: 0 }
    ];
    waitTimesList.forEach(t => {
      if (t <= 2) waitBuckets[0].count++;
      else if (t <= 5) waitBuckets[1].count++;
      else if (t <= 10) waitBuckets[2].count++;
      else if (t <= 20) waitBuckets[3].count++;
      else waitBuckets[4].count++;
    });

    return {
      eventosHistoricos,
      totalVehiculosAtendidos,
      totalVehiculosRedirigidos,
      totalVehiculosPerdidosCombustible,
      tiempoEsperaPromedio: tEsperaPromedio,
      tiempoServicioPromedio: tServicioPromedio,
      costoTotalEstimado: totalFuelRevenue + totalOpportunityCosts,
      utilizations,
      queueHistoryData,
      fuelSawtoothData,
      waitBuckets,
      decisionScatterData,
      relojFinal: reloj
    };
  }, [config]);

  // Handle Simulated JWT Sign In
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      setJwtToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTYyODc2ODAwMH0');
      setAuthError('');
    } else {
      setAuthError('Credenciales inválidas. Use "admin" y "admin123" para la demo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setJwtToken('');
  };

  // Click on Reset Parameters con Binder de Vaadin reactive simulation
  const handleResetConfig = () => {
    setConfig({ ...DEFAULT_CONFIG });
    setBinderLog(`[RESTORED] Vaadin Binder: Desvinculado estados previos del Binder exitosamente. Ejecutando binder.readBean(nuevaConfig). Actualizando inputs en UI reactivamente.`);
    setBinderToast(true);
    setTimeout(() => setBinderToast(false), 5000);
  };

  // Excel/CSV Spanish formatted POI exporter simulation
  const handleExportCSV = () => {
    const headers = [
      'ID Vehiculo', 
      'Tiempo de Simulacion (min)', 
      'Marca de Tiempo (hh:mm:ss)',
      'Tipo de Evento', 
      'Surtidor Asociado', 
      'Ruta Elegida',
      'Volumen Despachado (L)',
      'Tiempo de Servicio (min)',
      'Costo Oportunidad (Bs/min)',
      'Analisis Tecnico y Decisiones Estocasticas'
    ];
    
    const rows = simulationResults.eventosHistoricos.map(e => {
      const t = e.tiempo;
      const horas = Math.floor(t / 60);
      const minutos = Math.floor(t % 60);
      const segundos = Math.floor((t * 60) % 60);
      const hhmmss = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

      return [
        e.idVehiculo > 0 ? `V-${e.idVehiculo}` : '—',
        e.tiempo.toFixed(2).replace('.', ','), // Format with Spanish decimals
        hhmmss,
        e.tipo,
        e.idSurtidor > 0 ? `Surtidor ${e.idSurtidor}` : '—',
        e.vehiculoDetalle?.rutaElegida || '—',
        e.vehiculoDetalle?.volumen ? e.vehiculoDetalle.volumen.toFixed(2).replace('.', ',') : '—',
        e.vehiculoDetalle?.tiempoServicio ? e.vehiculoDetalle.tiempoServicio.toFixed(2).replace('.', ',') : '—',
        e.vehiculoDetalle?.costoOportunidad ? e.vehiculoDetalle.costoOportunidad.toFixed(2).replace('.', ',') : '—',
        e.observaciones.replace(/,/g, ';') // Escape commas
      ];
    });

    // CSV UTF-8 BOM for Microsoft Excel Spanish compatibility
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `simulacion_eventos_coss_bu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white">
      
      {/* 1. AUTHENTICATION SHIELD (VAADIN SPRING SECURITY & JWT SIMULATOR) */}
      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-200 to-indigo-100">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-md transition-all">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 text-center">
                Estación de Servicio Coss Bu
              </h1>
              <p className="text-slate-500 text-xs mt-1 text-center font-mono">
                [Vaadin Spring Security + JWT Validation]
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Auth Shield Activo (Fase 4)
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Usuario del Sistema
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 placeholder-slate-400 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña JWT
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 placeholder-slate-400 focus:bg-white transition-all"
                />
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                <span>Validar JWT & Acceder</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <span className="text-[10px] text-slate-400">
                Credenciales seguras: <span className="text-slate-500 font-mono">admin / admin123</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. MAIN SYSTEM WORKSPACE (HIGH DENSITY THEME) */
        <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
          
          {/* SIDEBAR PANEL: PARAMETER CONTROLS (Stretched strictly 300px) */}
          <aside className="w-full md:w-[300px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col h-full shrink-0 shadow-sm">
            
            {/* Header branding */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Fuel className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold tracking-wide uppercase">Coss Bu Engine</h2>
                  <p className="text-[9px] text-indigo-300 font-mono">Fase 4 Estocástica</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Desconectar JWT"
                className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Config Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white text-xs">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configuración Global</span>
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Parámetros mutables para Binder de Vaadin" />
              </div>

              {/* Arrivals Lambda */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex justify-between">
                  <span>Lambda Arribos (λ)</span>
                  <span className="text-indigo-600 font-mono text-[10px]">{config.lambdaLlegadas} v/m</span>
                </label>
                <input 
                  type="number"
                  step="0.001"
                  min="0.01"
                  value={config.lambdaLlegadas}
                  onChange={(e) => setConfig({ ...config, lambdaLlegadas: parseFloat(e.target.value) || 0.1 })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                />
              </div>

              {/* Prices Section */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-2">
                <span className="font-bold text-[9px] uppercase text-slate-400 tracking-wider">Configuración de Precios</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Subvencionado (Bs)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={config.precioSubvencionado}
                      onChange={(e) => setConfig({ ...config, precioSubvencionado: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Internacional (Bs)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={config.precioInternacional}
                      onChange={(e) => setConfig({ ...config, precioInternacional: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-medium text-slate-600 flex justify-between">
                    <span>Incremento Trimestral</span>
                    <span className="text-[10px] text-slate-500 font-mono">Bs. {config.incrementoTrimestral}</span>
                  </label>
                  <input 
                    type="number"
                    step="0.05"
                    value={config.incrementoTrimestral}
                    onChange={(e) => setConfig({ ...config, incrementoTrimestral: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Pump/Station parameters */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-2">
                <span className="font-bold text-[9px] uppercase text-slate-400 tracking-wider">Parámetros de Estación</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Surtidores Subv.</label>
                    <input 
                      type="number"
                      min="1"
                      max="4"
                      value={config.numSurtidoresSubv}
                      onChange={(e) => setConfig({ ...config, numSurtidoresSubv: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Capacidad Tanque (L)</label>
                    <input 
                      type="number"
                      step="100"
                      value={config.capacidadTanque}
                      onChange={(e) => setConfig({ ...config, capacidadTanque: parseInt(e.target.value) || 1000 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Umbral Critico (L)</label>
                    <input 
                      type="number"
                      step="50"
                      value={config.umbralAbastecimiento}
                      onChange={(e) => setConfig({ ...config, umbralAbastecimiento: parseInt(e.target.value) || 100 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-medium text-slate-600">Intervalo Cisterna</label>
                    <input 
                      type="number"
                      step="10"
                      value={config.intervaloAbastecimiento}
                      onChange={(e) => setConfig({ ...config, intervaloAbastecimiento: parseInt(e.target.value) || 60 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Horizon limits */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tiempo Turno (min)</label>
                  <input 
                    type="number"
                    value={config.tiempoLimite}
                    onChange={(e) => setConfig({ ...config, tiempoLimite: parseInt(e.target.value) || 10 })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Max Vehículos</label>
                  <input 
                    type="number"
                    value={config.maxVehiculos}
                    onChange={(e) => setConfig({ ...config, maxVehiculos: parseInt(e.target.value) || 10 })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Opportunity costs per vehicle profile */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[9px] uppercase text-slate-400 tracking-wider">Costo Oportunidad Triangular (a, b, c)</span>
                </div>
                
                {/* 1. Transporte Pesado */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Trans. Pesado (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.tpCostoOpBase} onChange={(e) => setConfig({ ...config, tpCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.tpCostoOpModa} onChange={(e) => setConfig({ ...config, tpCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.tpCostoOpMax} onChange={(e) => setConfig({ ...config, tpCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>

                {/* 2. Minibus Publico */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Minibús Público (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.mpCostoOpBase} onChange={(e) => setConfig({ ...config, mpCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.mpCostoOpModa} onChange={(e) => setConfig({ ...config, mpCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.mpCostoOpMax} onChange={(e) => setConfig({ ...config, mpCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>

                {/* 3. Auto Particular */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Auto Particular (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.apCostoOpBase} onChange={(e) => setConfig({ ...config, apCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.apCostoOpModa} onChange={(e) => setConfig({ ...config, apCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.apCostoOpMax} onChange={(e) => setConfig({ ...config, apCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>

                {/* 4. Motocicleta */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Motocicleta (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.moCostoOpBase} onChange={(e) => setConfig({ ...config, moCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.moCostoOpModa} onChange={(e) => setConfig({ ...config, moCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.moCostoOpMax} onChange={(e) => setConfig({ ...config, moCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>

                {/* 5. Camion Mediano */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Camión Mediano (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.cmCostoOpBase} onChange={(e) => setConfig({ ...config, cmCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.cmCostoOpModa} onChange={(e) => setConfig({ ...config, cmCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.cmCostoOpMax} onChange={(e) => setConfig({ ...config, cmCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>

                {/* 6. Otros */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-600">Otros / Cisterna / Flota (Bs/min)</span>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" step="0.1" value={config.otCostoOpBase} onChange={(e) => setConfig({ ...config, otCostoOpBase: parseFloat(e.target.value) || 0 })} placeholder="a" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Mínimo (a)" />
                    <input type="number" step="0.1" value={config.otCostoOpModa} onChange={(e) => setConfig({ ...config, otCostoOpModa: parseFloat(e.target.value) || 0 })} placeholder="b" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Moda (b)" />
                    <input type="number" step="0.1" value={config.otCostoOpMax} onChange={(e) => setConfig({ ...config, otCostoOpMax: parseFloat(e.target.value) || 0 })} placeholder="c" className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-center" title="Máximo (c)" />
                  </div>
                </div>
              </div>

              {/* Seed Configuration */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Usar Semilla LCG</span>
                  <input 
                    type="checkbox"
                    checked={config.useFixedSeed}
                    onChange={(e) => setConfig({ ...config, useFixedSeed: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-50 border-slate-300 cursor-pointer"
                  />
                </div>
                {config.useFixedSeed && (
                  <input 
                    type="number"
                    value={config.semilla}
                    onChange={(e) => setConfig({ ...config, semilla: parseInt(e.target.value) || 12345 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                )}
              </div>
            </div>

            {/* Action button: Restaurar Valores (Vaadin Binder Reset fixed) */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1.5 shrink-0">
              <button
                onClick={handleResetConfig}
                className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded text-xs transition border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar Valores</span>
              </button>
              <div className="text-[9px] text-slate-400 text-center font-mono">
                Vaadin Binder Status: OK
              </div>
            </div>
          </aside>

          {/* MAIN SIMULATION DISPLAY PANEL */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
            
            {/* Top Stat Ribbon (Vaadin KPI Badges style) with COSTO TOTAL SYSTEM highlighted */}
            <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 shadow-xs">
              
              <div className="bg-slate-50 border border-slate-200 p-3 rounded flex items-center gap-2.5 border-l-4 border-l-indigo-600 shadow-2xs">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center shrink-0 border border-indigo-100">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Atendidos Totales</p>
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {simulationResults.totalVehiculosAtendidos.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded flex items-center gap-2.5 border-l-4 border-l-purple-600 shadow-2xs">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded flex items-center justify-center shrink-0 border border-purple-100">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Redirigidos al Int.</p>
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {simulationResults.totalVehiculosRedirigidos.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded flex items-center gap-2.5 border-l-4 border-l-amber-600 shadow-2xs">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded flex items-center justify-center shrink-0 border border-amber-100">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Espera Promedio</p>
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {simulationResults.tiempoEsperaPromedio.toFixed(2)} <span className="text-[10px] text-slate-500 font-sans font-normal">min</span>
                  </p>
                </div>
              </div>

              {/* HIGHLIGHTED CARD: COSTO TOTAL DEL SISTEMA (Requirement 3) */}
              <div className="relative bg-indigo-50 border border-indigo-200 p-3 rounded flex items-center gap-2.5 border-l-4 border-l-indigo-600 shadow-2xs group cursor-help"
                   title="Haga clic para ver el desglose macroeconómico">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 justify-between">
                    <p className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider">Costo Total Sistema</p>
                    <span className="text-[8px] bg-indigo-200 text-indigo-800 px-1 rounded font-bold uppercase">Clave</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-indigo-900">
                    {simulationResults.costoTotalEstimado.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[10px] font-sans font-normal">Bs</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Dashboard Content Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Binder Reactive Notification Toast (Vaadin reactive simulation) */}
              {binderToast && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800 text-xs shadow-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    <p><strong>{binderLog}</strong></p>
                  </div>
                  <button onClick={() => setBinderToast(false)} className="text-emerald-500 hover:text-emerald-800 font-bold ml-2">×</button>
                </div>
              )}

              {/* Costo Total Sistema Macroeconomic Explanation Panel (Requirement 3) */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-950 p-4 rounded text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Indicador Macroeconómico de Ineficiencia Logística</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El <strong className="text-white">Costo Total del Sistema</strong> suma el costo total neto pagado por combustible más el <strong className="text-indigo-200">costo estocástico acumulado por el tiempo perdido en colas</strong> (∑ tiempo_espera * costo_oportunidad de cada perfil de conductor). Revela el peaje invisible y la ineficiencia logística que las filas de espera subvencionadas introducen en la economía nacional.
                  </p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded font-mono text-[11px] text-indigo-200 self-stretch flex flex-col justify-center">
                  <div className="text-white font-bold text-center border-b border-white/10 pb-1 mb-1">Costo Sistema</div>
                  <div>Gasto Combustible + (∑ Espera * CostoOp)</div>
                </div>
              </div>

              {/* POST-EXECUTION PUMPS PERFORMANCE ANALYTICAL SUMMARY (Requirement 4) */}
              <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Gauge className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Rendimiento Analítico Final de Surtidores (Post-Ejecución)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {simulationResults.utilizations.map((pump) => (
                    <div key={pump.id} className="border border-slate-200 rounded p-3 bg-slate-50 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                        <span className="font-bold text-slate-800 text-[11px] font-mono">S{pump.id} ({pump.tipo === 'INT' ? 'Internacional' : 'Subvencionado'})</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${pump.tipo === 'INT' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {pump.tipo}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Utilización (Ocupación):</span>
                          <span className="font-mono font-bold text-slate-800">{pump.util}%</span>
                        </div>
                        {/* Progress utilization bar */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full ${pump.tipo === 'INT' ? 'bg-purple-500' : 'bg-indigo-600'}`} style={{ width: `${pump.util}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Tiempo Ocioso (Idle):</span>
                          <span className="font-mono text-slate-600">{pump.ocioso}%</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-200/60 pt-2 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">Atendidos:</span>
                        <span className="bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[10px]">{pump.atendidos} veh</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ANALYTICAL VISUAL CHARTS PANEL (Requirement 5) */}
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Analítica Visual Completa (Tabla 6.2)</span>
                  </div>
                  {/* Selector tabs */}
                  <div className="flex flex-wrap gap-1">
                    <button 
                      onClick={() => setActiveChartTab('cola')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                        activeChartTab === 'cola' 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Longitud de Cola (Qs/Qi)
                    </button>
                    <button 
                      onClick={() => setActiveChartTab('combustible')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                        activeChartTab === 'combustible' 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Dientes de Sierra Combustible (N)
                    </button>
                    <button 
                      onClick={() => setActiveChartTab('decision')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                        activeChartTab === 'decision' 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Dispersión Costos Estimados (Cs/Ci)
                    </button>
                    <button 
                      onClick={() => setActiveChartTab('espera')}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                        activeChartTab === 'espera' 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Histograma Tiempos de Espera
                    </button>
                  </div>
                </div>

                {/* Chart stage */}
                <div className="p-5 h-[340px] bg-white">
                  
                  {activeChartTab === 'cola' && (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Evolución en Tiempo Real de las Colas de Espera</span>
                        <div className="flex gap-4 text-[10px] font-mono">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-600 rounded"></span>Qs (Subvencionada)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-purple-500 rounded"></span>Qi (Internacional)</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={simulationResults.queueHistoryData}>
                            <defs>
                              <linearGradient id="colorQs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorQi" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="tiempo" stroke="#94a3b8" fontSize={9} label={{ value: 'Tiempo de Simulación (minutos)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" fontSize={9} label={{ value: 'Vehículos', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                            <Area type="stepAfter" dataKey="Qs" stroke="#4f46e5" strokeWidth={1.5} fillOpacity={1} fill="url(#colorQs)" name="Cola Subvencionada (Qs)" />
                            <Area type="stepAfter" dataKey="Qi" stroke="#a855f7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorQi)" name="Cola Internacional (Qi)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {activeChartTab === 'combustible' && (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nivel de Combustible Disponible en el Tanque Subterráneo (N)</span>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">Efecto Dientes de Sierra</span>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={simulationResults.fuelSawtoothData}>
                            <defs>
                              <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="tiempo" stroke="#94a3b8" fontSize={9} label={{ value: 'Reloj de Simulación (minutos)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" fontSize={9} domain={[0, config.capacidadTanque]} label={{ value: 'Combustible Disponible (Litros)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                            <Area type="monotone" dataKey="N" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorN)" name="Litros en Tanque (N)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {activeChartTab === 'decision' && (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gráfico de Dispersión Comparativo de Costos de Decisión al Arribar</span>
                        <div className="flex gap-4 text-[10px] font-mono">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>Subvencionados (SUBV)</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>Internacional (INT)</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" dataKey="costoSubv" stroke="#94a3b8" fontSize={9} name="Costo Estimado Subvencionado" unit=" Bs" />
                            <YAxis type="number" dataKey="costoInt" stroke="#94a3b8" fontSize={9} name="Costo Estimado Internacional" unit=" Bs" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend verticalAlign="top" height={36} />
                            <Scatter name="Ruta SUBV elegida" data={simulationResults.decisionScatterData.filter(d => d.ruta === 'SUBV')} fill="#4f46e5" shape="circle" />
                            <Scatter name="Ruta INT elegida" data={simulationResults.decisionScatterData.filter(d => d.ruta === 'INT')} fill="#a855f7" shape="triangle" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {activeChartTab === 'espera' && (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Frecuencia de Distribución de Tiempos de Espera Reales de los Atendidos</span>
                        <span className="text-[10px] font-mono text-amber-600">Intervalos de Espera en Fila</span>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={simulationResults.waitBuckets}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} label={{ value: 'Vehículos Atendidos', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                            <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Vehículos">
                              {simulationResults.waitBuckets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index <= 2 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* DENSE INTERACTIVE EVENT LOGGER GRID */}
              <div className="bg-white border border-slate-200 rounded overflow-hidden flex flex-col shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bitácora de Eventos de Simulación Estocástica (Coss Bu)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grid analítica de eventos discretos. Haga clic en una fila para inspeccionar los cálculos lógicos.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="self-start sm:self-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Excel (.xlsx/.csv)</span>
                  </button>
                </div>

                {/* Table stage */}
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-[10px] font-mono">Vehículo</th>
                        <th className="p-3 text-[10px] font-mono">Reloj (min)</th>
                        <th className="p-3 text-[10px] font-mono">Marca Tiempo</th>
                        <th className="p-3 text-[10px] font-mono">Evento</th>
                        <th className="p-3 text-[10px] font-mono">Surtidor</th>
                        <th className="p-3 text-[10px]">Análisis Técnico de Decisión Económica (Coss Bu)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {simulationResults.eventosHistoricos.map((ev, index) => {
                        const t = ev.tiempo;
                        const horas = Math.floor(t / 60);
                        const minutos = Math.floor(t % 60);
                        const segundos = Math.floor((t * 60) % 60);
                        const timeString = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

                        return (
                          <tr 
                            key={index} 
                            onClick={() => setSelectedEvent(ev)}
                            className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                          >
                            <td className="p-3 font-mono font-bold text-indigo-600">
                              {ev.idVehiculo > 0 ? `V-${ev.idVehiculo}` : '—'}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {ev.tiempo.toFixed(2)} min
                            </td>
                            <td className="p-3 font-mono text-slate-400">
                              {timeString}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                                ev.tipo === 'INICIO' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                ev.tipo === 'LLEGADA' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                ev.tipo === 'FIN_CARGA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}>
                                {ev.tipo}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-mono text-[11px]">
                              {ev.idSurtidor > 0 ? `Surtidor ${ev.idSurtidor}` : '—'}
                            </td>
                            <td className="p-3 text-slate-600 max-w-md truncate font-sans">
                              {ev.observaciones}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </main>

          {/* VAADIN MODAL DIALOG (Requirement 4 detail click on row) */}
          {selectedEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden text-slate-800 text-xs">
                
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center border border-indigo-100">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Análisis Pormenorizado - Coss Bu</h3>
                      <p className="text-[10px] text-slate-400 font-mono">[Vaadin Dialog Modal]</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto bg-white">
                  
                  {/* Event key states */}
                  <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Asociación</span>
                      <strong className="font-mono text-indigo-600">
                        {selectedEvent.idVehiculo > 0 ? `Vehículo V-${selectedEvent.idVehiculo}` : 'N/A (Estación)'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Reloj Simulación</span>
                      <strong className="font-mono text-slate-700">{selectedEvent.tiempo.toFixed(2)} min</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Tipo Evento</span>
                      <strong className="text-slate-700">{selectedEvent.tipo}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Ubicación</span>
                      <strong className="text-slate-700">{selectedEvent.idSurtidor > 0 ? `Surtidor ${selectedEvent.idSurtidor}` : '—'}</strong>
                    </div>
                  </div>

                  {/* Observaciones text */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Descripción Técnica:</span>
                    <p className="p-3 bg-slate-50 border border-slate-200 text-slate-600 rounded leading-relaxed">
                      {selectedEvent.observaciones}
                    </p>
                  </div>

                  {/* Vehicle Stochastic properties if valid LLEGADA */}
                  {selectedEvent.vehiculoDetalle && selectedEvent.vehiculoDetalle.rutaElegida !== 'RECHAZADO' && (
                    <div className="space-y-3">
                      
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[9px] font-bold uppercase text-slate-400">Atributos Estocásticos Generados:</span>
                        <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px]">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">Categoría del Vehículo:</span>
                            <strong className="text-slate-700">{selectedEvent.vehiculoDetalle.tipo}</strong>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">Volumen Demandado (L):</span>
                            <strong className="text-slate-700">{selectedEvent.vehiculoDetalle.volumen?.toFixed(2)} Litros</strong>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">Tiempo de Despacho (min):</span>
                            <strong className="text-slate-700">{selectedEvent.vehiculoDetalle.tiempoServicio?.toFixed(2)} min</strong>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">Costo de Oportunidad:</span>
                            <strong className="text-slate-700">{selectedEvent.vehiculoDetalle.costoOportunidad?.toFixed(2)} Bs/min</strong>
                          </div>
                        </div>
                      </div>

                      {/* Decison metrics equation */}
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Ecuaciones Matemáticas de Decisión:</span>
                        <div className="bg-slate-900 border border-slate-950 p-3 rounded font-mono text-[10px] space-y-1.5 text-slate-300">
                          <div>
                            <span className="text-slate-500">// Espera Proyectada en Surtidores Locales</span>
                            <p className="text-indigo-300">
                              Espera_Subv = (Cola_Subv + 1) * (Suma_Tiempos_Servicio / Veh_Atendidos) = {(selectedEvent.vehiculoDetalle.esperaProyectadaSubv || 0).toFixed(2)} min
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">// Ecuación de Costo Subvencionado</span>
                            <p className="text-amber-400">
                              Costo_Subv = (Volumen * {config.precioSubvencionado}) + (Espera_Subv * {selectedEvent.vehiculoDetalle.costoOportunidad?.toFixed(2)}) = {selectedEvent.vehiculoDetalle.costoSubv?.toFixed(2)} Bs
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">// Ecuación de Costo Internacional (Espera cero)</span>
                            <p className="text-purple-400">
                              Costo_Int = (Volumen * {config.precioInternacional}) + (0.0 * {selectedEvent.vehiculoDetalle.costoOportunidad?.toFixed(2)}) = {selectedEvent.vehiculoDetalle.costoInt?.toFixed(2)} Bs
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          * Conforme a la sección 6.1.1 de la Fase 4, los conductores eligen la opción que minimice el costo económico percibido (Costo combustible + Costo de espera).
                        </p>
                      </div>

                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
