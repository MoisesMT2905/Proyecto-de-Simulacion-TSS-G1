package com.cossbu.simulator.model;

public class Evento implements Comparable<Evento> {
    private double tiempo;
    private String tipo; // "LLEGADA", "FIN_CARGA", "ABASTECIMIENTO"
    private int idSurtidor;
    private int idVehiculo;
    private String observaciones; // Para detallar la lógica de decisión en español

    public Evento() {}

    public Evento(double tiempo, String tipo, int idSurtidor, int idVehiculo) {
        this.tiempo = tiempo;
        this.tipo = tipo;
        this.idSurtidor = idSurtidor;
        this.idVehiculo = idVehiculo;
    }

    public Evento(double tiempo, String tipo, int idSurtidor, int idVehiculo, String observaciones) {
        this.tiempo = tiempo;
        this.tipo = tipo;
        this.idSurtidor = idSurtidor;
        this.idVehiculo = idVehiculo;
        this.observaciones = observaciones;
    }

    // Getters y Setters
    public double getTiempo() { return tiempo; }
    public void setTiempo(double tiempo) { this.tiempo = tiempo; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public int getIdSurtidor() { return idSurtidor; }
    public void setIdSurtidor(int idSurtidor) { this.idSurtidor = idSurtidor; }

    public int getIdVehiculo() { return idVehiculo; }
    public void setIdVehiculo(int idVehiculo) { this.idVehiculo = idVehiculo; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    @Override
    public int compareTo(Evento otro) {
        return Double.compare(this.tiempo, otro.tiempo);
    }
}
