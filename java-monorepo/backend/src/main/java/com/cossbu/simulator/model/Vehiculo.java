package com.cossbu.simulator.model;

public class Vehiculo {
    private int id;
    private String tipo;
    private double volumen; // litros
    private double tiempoServicio; // minutos
    private double costoOportunidad; // Bs/min
    private double horaLlegada;
    private double horaInicioCarga;
    private double horaFinCarga;
    private String rutaElegida; // "SUBV" o "INT"

    public Vehiculo() {}

    public Vehiculo(int id, String tipo, double volumen, double tiempoServicio, double costoOportunidad, double horaLlegada) {
        this.id = id;
        this.tipo = tipo;
        this.volumen = volumen;
        this.tiempoServicio = tiempoServicio;
        this.costoOportunidad = costoOportunidad;
        this.horaLlegada = horaLlegada;
    }

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public double getVolumen() { return volumen; }
    public void setVolumen(double volumen) { this.volumen = volumen; }

    public double getTiempoServicio() { return tiempoServicio; }
    public void setTiempoServicio(double tiempoServicio) { this.tiempoServicio = tiempoServicio; }

    public double getCostoOportunidad() { return costoOportunidad; }
    public void setCostoOportunidad(double costoOportunidad) { this.costoOportunidad = costoOportunidad; }

    public double getHoraLlegada() { return horaLlegada; }
    public void setHoraLlegada(double horaLlegada) { this.horaLlegada = horaLlegada; }

    public double getHoraInicioCarga() { return horaInicioCarga; }
    public void setHoraInicioCarga(double horaInicioCarga) { this.horaInicioCarga = horaInicioCarga; }

    public double getHoraFinCarga() { return horaFinCarga; }
    public void setHoraFinCarga(double horaFinCarga) { this.horaFinCarga = horaFinCarga; }

    public String getRutaElegida() { return rutaElegida; }
    public void setRutaElegida(String rutaElegida) { this.rutaElegida = rutaElegida; }
}
