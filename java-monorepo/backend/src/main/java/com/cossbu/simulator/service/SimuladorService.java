package com.cossbu.simulator.service;

import com.cossbu.simulator.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SimuladorService {

    public ResultadoSimulacion ejecutarSimulacion(Configuracion config, Long semilla) {
        Random rand = (semilla != null) ? new Random(semilla) : new Random();
        
        // Inicialización de variables de estado
        double reloj = 0.0;
        double nivelCombustible = config.getCapacidadTanque();
        
        // Inicialización de surtidores
        List<Surtidor> surtidores = new ArrayList<>();
        // 4 Surtidores subvencionados (IDs 1 a 4)
        for (int i = 1; i <= config.getNumSurtidoresSubv(); i++) {
            surtidores.add(new Surtidor(i, "SUBV"));
        }
        // 1 Surtidor internacional (ID 5)
        surtidores.add(new Surtidor(5, "INT"));

        // Calendario de eventos (PriorityQueue)
        PriorityQueue<Evento> calendario = new PriorityQueue<>();
        
        // Listas auxiliares para colas
        List<Vehiculo> colaSubv = new ArrayList<>();
        List<Vehiculo> colaInt = new ArrayList<>();
        
        // Históricos
        List<Evento> eventosHistoricos = new ArrayList<>();
        List<Vehiculo> vehiculosAtendidos = new ArrayList<>();
        List<Double> historialCola = new ArrayList<>();
        
        // Contadores y acumuladores de estadísticas
        int totalVehiculosAtendidos = 0;
        int totalVehiculosRedirigidos = 0;
        int totalVehiculosPerdidosCombustible = 0;
        double sumaTiemposEspera = 0.0;
        double sumaTiemposServicio = 0.0;
        double areaColaSubv = 0.0;
        double ultimoCambioCola = 0.0;
        double[] tiempoOciosoSurtidores = new double[6]; // index 1 to 5
        double[] ultimoCambioSurtidor = new double[6];

        // 1. Programar primera llegada
        double r1 = rand.nextDouble();
        double tiempoLlegada = - (1.0 / config.getLambdaLlegadas()) * Math.log(r1);
        calendario.add(new Evento(tiempoLlegada, "LLEGADA", 0, 1));

        // 2. Programar primer abastecimiento
        calendario.add(new Evento(config.getIntervaloAbastecimiento(), "ABASTECIMIENTO", 0, 0));

        int idVehiculoContador = 1;

        // BUCLE PRINCIPAL DE LA SIMULACIÓN (Coss Bu)
        while (!calendario.isEmpty() && reloj < config.getTiempoLimite() && totalVehiculosAtendidos < config.getMaxVehiculos()) {
            Evento proximoEvento = calendario.poll();
            if (proximoEvento == null) break;
            
            double tiempoAnterior = reloj;
            reloj = proximoEvento.getTiempo();
            if (reloj >= config.getTiempoLimite()) break;

            // Actualizar áreas de cola (integral de longitud de cola subvencionada)
            areaColaSubv += colaSubv.size() * (reloj - tiempoAnterior);

            // Procesar evento según su tipo
            switch (proximoEvento.getTipo()) {
                case "LLEGADA": {
                    // Generación de atributos del vehículo (Fase 3 Coss Bu)
                    String tipoVehiculo = generarTipoVehiculo(rand.nextDouble());
                    double volumen = generarVolumen(tipoVehiculo, rand.nextDouble());
                    double tiempoServicio = generarTiempoServicio(tipoVehiculo, rand.nextDouble());
                    double costoOportunidad = generarCostoOportunidad(tipoVehiculo, rand.nextDouble(), config);

                    Vehiculo v = new Vehiculo(idVehiculoContador++, tipoVehiculo, volumen, tiempoServicio, costoOportunidad, reloj);

                    // Validar combustible
                    if (nivelCombustible < volumen) {
                        totalVehiculosPerdidosCombustible++;
                        proximoEvento.setObservaciones("Vehículo V-" + v.getId() + " (" + tipoVehiculo + ") rechazado por falta de combustible. Nivel actual: " + String.format("%.2f", nivelCombustible) + "L.");
                        eventosHistoricos.add(proximoEvento);
                        
                        // Programar abastecimiento de emergencia en 5 min si no está programado
                        boolean abastecimientoProgramado = calendario.stream().anyMatch(e -> e.getTipo().equals("ABASTECIMIENTO"));
                        if (!abastecimientoProgramado) {
                            calendario.add(new Evento(reloj + 5.0, "ABASTECIMIENTO", 0, 0));
                        }
                        
                        // Programar siguiente llegada
                        double rNext = rand.nextDouble();
                        double tNext = reloj - (1.0 / config.getLambdaLlegadas()) * Math.log(rNext);
                        calendario.add(new Evento(tNext, "LLEGADA", 0, idVehiculoContador));
                        break;
                    }

                    // Evaluación de la decisión de ruta (Coss Bu)
                    // Estimar tiempo de espera en subvencionado
                    double esperaProyectadaSubv = (colaSubv.size() + 1) * (sumaTiemposServicio / Math.max(1, totalVehiculosAtendidos));
                    double costoSubv = (volumen * config.getPrecioSubvencionado()) + (esperaProyectadaSubv * costoOportunidad);
                    double costoInt = (volumen * config.getPrecioInternacional()) + (0.0 * costoOportunidad); // espera cero en internacional

                    String observacionDecision;
                    if (costoSubv < costoInt) {
                        v.setRutaElegida("SUBV");
                        observacionDecision = String.format("Decisión: SUBVENCIONADO (Costo Est. Subv: %.2f Bs < Int: %.2f Bs). ", costoSubv, costoInt);
                        
                        // Buscar surtidor subvencionado libre
                        int surtidorLibreId = -1;
                        for (int s = 0; s < config.getNumSurtidoresSubv(); s++) {
                            if (!surtidores.get(s).isOcupado()) {
                                surtidorLibreId = surtidores.get(s).getId();
                                break;
                            }
                        }

                        if (surtidorLibreId != -1) {
                            // Atender de inmediato
                            Surtidor s = surtidores.get(surtidorLibreId - 1);
                            s.setOcupado(true);
                            s.setTiempoFinServicio(reloj + tiempoServicio);
                            v.setHoraInicioCarga(reloj);
                            
                            calendario.add(new Evento(reloj + tiempoServicio, "FIN_CARGA", surtidorLibreId, v.getId()));
                            totalVehiculosAtendidos++;
                            sumaTiemposServicio += tiempoServicio;
                            vehiculosAtendidos.add(v);
                            observacionDecision += "Atendido inmediatamente en Surtidor " + surtidorLibreId + ".";
                        } else {
                            // Encolar
                            colaSubv.add(v);
                            observacionDecision += "Surtidores ocupados, ingresa a la Cola Subvencionada (Longitud: " + colaSubv.size() + ").";
                        }
                    } else {
                        v.setRutaElegida("INT");
                        totalVehiculosRedirigidos++;
                        observacionDecision = String.format("Decisión: INTERNACIONAL (Costo Est. Int: %.2f Bs <= Subv: %.2f Bs). Redirigido. ", costoInt, costoSubv);

                        Surtidor s5 = surtidores.get(4); // Surtidor 5 es internacional
                        if (!s5.isOcupado()) {
                            s5.setOcupado(true);
                            s5.setTiempoFinServicio(reloj + tiempoServicio);
                            v.setHoraInicioCarga(reloj);
                            
                            calendario.add(new Evento(reloj + tiempoServicio, "FIN_CARGA", 5, v.getId()));
                            totalVehiculosAtendidos++;
                            sumaTiemposServicio += tiempoServicio;
                            vehiculosAtendidos.add(v);
                            observacionDecision += "Atendido inmediatamente en Surtidor 5 (Internacional).";
                        } else {
                            colaInt.add(v);
                            observacionDecision += "Surtidor 5 ocupado, ingresa a la Cola Internacional (Longitud: " + colaInt.size() + ").";
                        }
                    }

                    // Descontar combustible
                    nivelCombustible -= volumen;
                    
                    proximoEvento.setObservaciones(observacionDecision);
                    eventosHistoricos.add(proximoEvento);

                    // Programar próxima llegada
                    double rNext = rand.nextDouble();
                    double tNext = reloj - (1.0 / config.getLambdaLlegadas()) * Math.log(rNext);
                    calendario.add(new Evento(tNext, "LLEGADA", 0, idVehiculoContador));
                    break;
                }

                case "FIN_CARGA": {
                    int sId = proximoEvento.getIdSurtidor();
                    Surtidor s = surtidores.get(sId - 1);
                    s.setOcupado(false);

                    // Encontrar vehículo correspondiente
                    final int vehId = proximoEvento.getIdVehiculo();
                    Vehiculo v = vehiculosAtendidos.stream()
                            .filter(veh -> veh.getId() == vehId)
                            .findFirst()
                            .orElse(null);

                    double tiempoEspera = 0.0;
                    if (v != null) {
                        v.setHoraFinCarga(reloj);
                        tiempoEspera = v.getHoraInicioCarga() - v.getHoraLlegada();
                        sumaTiemposEspera += tiempoEspera;
                    }

                    String obsFin = "Finaliza carga de Vehículo V-" + vehId + " en Surtidor " + sId + ". Tiempo espera real: " + String.format("%.2f", tiempoEspera) + " min.";

                    // Atender al siguiente vehículo en la cola
                    if (sId <= config.getNumSurtidoresSubv()) {
                        if (!colaSubv.isEmpty()) {
                            Vehiculo proxV = colaSubv.remove(0);
                            proxV.setHoraInicioCarga(reloj);
                            s.setOcupado(true);
                            s.setTiempoFinServicio(reloj + proxV.getTiempoServicio());
                            calendario.add(new Evento(reloj + proxV.getTiempoServicio(), "FIN_CARGA", sId, proxV.getId()));
                            totalVehiculosAtendidos++;
                            sumaTiemposServicio += proxV.getTiempoServicio();
                            vehiculosAtendidos.add(proxV);
                            obsFin += " Desencola V-" + proxV.getId() + " e inicia servicio en Surtidor " + sId + ".";
                        }
                    } else {
                        if (!colaInt.isEmpty()) {
                            Vehiculo proxV = colaInt.remove(0);
                            proxV.setHoraInicioCarga(reloj);
                            s.setOcupado(true);
                            s.setTiempoFinServicio(reloj + proxV.getTiempoServicio());
                            calendario.add(new Evento(reloj + proxV.getTiempoServicio(), "FIN_CARGA", 5, proxV.getId()));
                            totalVehiculosAtendidos++;
                            sumaTiemposServicio += proxV.getTiempoServicio();
                            vehiculosAtendidos.add(proxV);
                            obsFin += " Desencola V-" + proxV.getId() + " e inicia servicio en Surtidor 5.";
                        }
                    }

                    proximoEvento.setObservaciones(obsFin);
                    eventosHistoricos.add(proximoEvento);
                    break;
                }

                case "ABASTECIMIENTO": {
                    nivelCombustible = config.getCapacidadTanque();
                    String obsAbast = String.format("Llega camión cisterna. Reabastecimiento completo del tanque a %.2f L.", nivelCombustible);
                    proximoEvento.setObservaciones(obsAbast);
                    eventosHistoricos.add(proximoEvento);

                    // Programar próximo abastecimiento
                    calendario.add(new Evento(reloj + config.getIntervaloAbastecimiento(), "ABASTECIMIENTO", 0, 0));
                    break;
                }
            }

            historialCola.add((double) colaSubv.size());
            
            // Limitador de eventos en memoria para evitar saturar el Heap en corridas masivas
            if (eventosHistoricos.size() > 5000) {
                // Se mantiene el tamaño máximo para la grid del frontend, pero se acumula el resto de estadísticas
            }
        }

        // Finalizar y calcular métricas
        ResultadoSimulacion resultado = new ResultadoSimulacion();
        resultado.setEventosHistoricos(eventosHistoricos);
        resultado.setTiempoTotal(reloj);
        resultado.setTotalVehiculosAtendidos(totalVehiculosAtendidos);
        resultado.setTotalVehiculosRedirigidos(totalVehiculosRedirigidos);
        resultado.setTotalVehiculosPerdidosCombustible(totalVehiculosPerdidosCombustible);
        
        double esperaPromedio = totalVehiculosAtendidos > 0 ? (sumaTiemposEspera / totalVehiculosAtendidos) : 0.0;
        double servicioPromedio = totalVehiculosAtendidos > 0 ? (sumaTiemposServicio / totalVehiculosAtendidos) : 0.0;
        resultado.setTiempoEsperaPromedio(esperaPromedio);
        resultado.setTiempoServicioPromedio(servicioPromedio);

        // Costo total estimado del sistema
        double costoCombustibleAtendido = vehiculosAtendidos.stream()
                .mapToDouble(v -> v.getVolumen() * (v.getRutaElegida().equals("SUBV") ? config.getPrecioSubvencionado() : config.getPrecioInternacional()))
                .sum();
        double costoEsperaAtendidos = vehiculosAtendidos.stream()
                .mapToDouble(v -> (v.getHoraInicioCarga() - v.getHoraLlegada()) * v.getCostoOportunidad())
                .sum();
        resultado.setCostoTotalEstimado(costoCombustibleAtendido + costoEsperaAtendidos);

        // Utilización promedio estimada
        double utilizacion = totalVehiculosAtendidos > 0 ? (sumaTiemposServicio / (reloj * 5.0)) * 100.0 : 0.0;
        resultado.setUtilizacionSurtidores(Math.min(utilizacion, 100.0));
        resultado.setHistorialCola(historialCola);

        return resultado;
    }

    // ========== GENERADORES STOCHASTICOS (Coss Bu) ==========

    private String generarTipoVehiculo(double r) {
        if (r < 0.2339) return "Transporte Pesado";
        else if (r < 0.4920) return "Minibus Publico";
        else if (r < 0.6372) return "Auto Particular";
        else if (r < 0.7582) return "Motocicleta";
        else if (r < 0.8308) return "Volqueta";
        else if (r < 0.8792) return "Flota Interdepartamental";
        else if (r < 0.9357) return "Cisterna (Sistema)";
        else return "Camion Mediano";
    }

    private double generarVolumen(String tipo, double r) {
        switch (tipo) {
            case "Transporte Pesado": return 280.0 + r * (400.0 - 280.0);
            case "Minibus Publico": return 40.0 + r * (49.0 - 40.0);
            case "Auto Particular": return 35.0 + r * (45.0 - 35.0);
            case "Motocicleta": return 7.0 + r * (10.0 - 7.0);
            case "Volqueta": return 170.0 + r * (210.0 - 170.0);
            case "Flota Interdepartamental": return 260.0 + r * (300.0 - 260.0);
            case "Cisterna (Sistema)": return 280.0 + r * (350.0 - 280.0);
            default: return 85.0 + r * (110.0 - 85.0); // Camion Mediano
        }
    }

    private double generarTiempoServicio(String tipo, double r) {
        switch (tipo) {
            case "Transporte Pesado": return 8.38 + r * (11.51 - 8.38);
            case "Minibus Publico": return 3.12 + r * (3.60 - 3.12);
            case "Auto Particular": return 3.04 + r * (3.50 - 3.04);
            case "Motocicleta": return 1.44 + r * (1.55 - 1.44);
            case "Volqueta": return 5.42 + r * (6.33 - 5.42);
            case "Flota Interdepartamental": return 8.19 + r * (9.18 - 8.19);
            case "Cisterna (Sistema)": return 8.35 + r * (10.34 - 8.35);
            default: return 4.21 + r * (4.75 - 4.21); // Camion Mediano
        }
    }

    private double generarCostoOportunidad(String tipo, double r, Configuracion config) {
        double a, b, c;
        switch (tipo) {
            case "Transporte Pesado":
                a = config.getTpCostoOpBase();
                b = config.getTpCostoOpModa();
                c = config.getTpCostoOpMax();
                break;
            case "Minibus Publico":
                a = config.getMpCostoOpBase();
                b = config.getMpCostoOpModa();
                c = config.getMpCostoOpMax();
                break;
            case "Auto Particular":
                a = config.getApCostoOpBase();
                b = config.getApCostoOpModa();
                c = config.getApCostoOpMax();
                break;
            case "Motocicleta":
                a = config.getMoCostoOpBase();
                b = config.getMoCostoOpModa();
                c = config.getMoCostoOpMax();
                break;
            case "Camion Mediano":
                a = config.getCmCostoOpBase();
                b = config.getCmCostoOpModa();
                c = config.getCmCostoOpMax();
                break;
            default: // Volqueta, Flota, Cisterna
                a = config.getDfCostoOpBase();
                b = config.getDfCostoOpModa();
                c = config.getDfCostoOpMax();
                break;
        }
        double p = (b - a) / (c - a);
        if (r <= p) {
            return a + Math.sqrt(r * (b - a) * (c - a));
        } else {
            return c - Math.sqrt((1.0 - r) * (c - b) * (c - a));
        }
    }
}
