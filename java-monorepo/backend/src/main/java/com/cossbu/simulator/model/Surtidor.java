package com.cossbu.simulator.model;

import java.util.LinkedList;
import java.util.Queue;

public class Surtidor {
    private int id;
    private boolean ocupado;
    private double tiempoFinServicio;
    private String tipo; // "SUBV" o "INT"
    private Queue<Vehiculo> cola = new LinkedList<>();

    public Surtidor() {}

    public Surtidor(int id, String tipo) {
        this.id = id;
        this.tipo = tipo;
        this.ocupado = false;
        this.tiempoFinServicio = 0.0;
    }

    // Métodos helper
    public void iniciarCarga(Vehiculo v, double duracion) {
        this.ocupado = true;
        this.tiempoFinServicio = duracion;
    }

    public void liberar() {
        this.ocupado = false;
        this.tiempoFinServicio = 0.0;
    }

    public void encolar(Vehiculo v) {
        cola.offer(v);
    }

    public Vehiculo desencolar() {
        return cola.poll();
    }

    public int getTamanoCola() {
        return cola.size();
    }

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public boolean isOcupado() { return ocupado; }
    public void setOcupado(boolean ocupado) { this.ocupado = ocupado; }

    public double getTiempoFinServicio() { return tiempoFinServicio; }
    public void setTiempoFinServicio(double tiempoFinServicio) { this.tiempoFinServicio = tiempoFinServicio; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Queue<Vehiculo> getCola() { return cola; }
    public void setCola(Queue<Vehiculo> cola) { this.cola = cola; }
}
