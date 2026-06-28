package com.cossbu.simulator.model;

import java.util.List;

public class ResultadoSimulacion {
    private List<Evento> eventosHistoricos;
    private double tiempoTotal;
    private int totalVehiculosAtendidos;
    private int totalVehiculosRedirigidos;
    private int totalVehiculosPerdidosCombustible;
    private double tiempoEsperaPromedio;
    private double tiempoServicioPromedio;
    private double costoTotalEstimado;
    private double utilizacionSurtidores; // Porcentaje promedio de ocupación
    private List<Double> historialCola; // Historial de longitud de cola subvencionada para gráficos

    public ResultadoSimulacion() {}

    // Getters y Setters
    public List<Evento> getEventosHistoricos() { return eventosHistoricos; }
    public void setEventosHistoricos(List<Evento> eventosHistoricos) { this.eventosHistoricos = eventosHistoricos; }

    public double getTiempoTotal() { return tiempoTotal; }
    public void setTiempoTotal(double tiempoTotal) { this.tiempoTotal = tiempoTotal; }

    public int getTotalVehiculosAtendidos() { return totalVehiculosAtendidos; }
    public void setTotalVehiculosAtendidos(int totalVehiculosAtendidos) { this.totalVehiculosAtendidos = totalVehiculosAtendidos; }

    public int getTotalVehiculosRedirigidos() { return totalVehiculosRedirigidos; }
    public void setTotalVehiculosRedirigidos(int totalVehiculosRedirigidos) { this.totalVehiculosRedirigidos = totalVehiculosRedirigidos; }

    public int getTotalVehiculosPerdidosCombustible() { return totalVehiculosPerdidosCombustible; }
    public void setTotalVehiculosPerdidosCombustible(int totalVehiculosPerdidosCombustible) { this.totalVehiculosPerdidosCombustible = totalVehiculosPerdidosCombustible; }

    public double getTiempoEsperaPromedio() { return tiempoEsperaPromedio; }
    public void setTiempoEsperaPromedio(double tiempoEsperaPromedio) { this.tiempoEsperaPromedio = tiempoEsperaPromedio; }

    public double getTiempoServicioPromedio() { return tiempoServicioPromedio; }
    public void setTiempoServicioPromedio(double tiempoServicioPromedio) { this.tiempoServicioPromedio = tiempoServicioPromedio; }

    public double getCostoTotalEstimado() { return costoTotalEstimado; }
    public void setCostoTotalEstimado(double costoTotalEstimado) { this.costoTotalEstimado = costoTotalEstimado; }

    public double getUtilizacionSurtidores() { return utilizacionSurtidores; }
    public void setUtilizacionSurtidores(double utilizacionSurtidores) { this.utilizacionSurtidores = utilizacionSurtidores; }

    public List<Double> getHistorialCola() { return historialCola; }
    public void setHistorialCola(List<Double> historialCola) { this.historialCola = historialCola; }
}
