package com.cossbu.simulator.model;

public class Configuracion {
    // Parámetros de precios
    private double precioSubvencionado = 6.96;
    private double precioInternacional = 12.50;
    private double incrementoTrimestral = 1.35; // Base 1.35 Bs according to Fase 4

    // Parámetros de la estación
    private int numSurtidoresSubv = 4;
    private double capacidadTanque = 10000.0;
    private double umbralAbastecimiento = 500.0;
    private double intervaloAbastecimiento = 240.0; // minutos (4 horas)

    // Parámetros de simulación
    private double tiempoLimite = 480.0; // minutos (8 horas)
    private int maxVehiculos = 1000;
    private double lambdaLlegadas = 0.3425; // vehículos por minuto

    // Parámetros del costo de oportunidad (distribución triangular por tipo de vehículo)
    private double tpCostoOpBase = 2.5;
    private double tpCostoOpModa = 3.5;
    private double tpCostoOpMax = 4.0;

    private double mpCostoOpBase = 0.8;
    private double mpCostoOpModa = 1.2;
    private double mpCostoOpMax = 1.7;

    private double apCostoOpBase = 0.3;
    private double apCostoOpModa = 0.5;
    private double apCostoOpMax = 0.8;

    private double moCostoOpBase = 0.2;
    private double moCostoOpModa = 0.3;
    private double moCostoOpMax = 0.5;

    private double cmCostoOpBase = 1.5;
    private double cmCostoOpModa = 2.0;
    private double cmCostoOpMax = 2.5;

    private double dfCostoOpBase = 2.0;
    private double dfCostoOpModa = 3.0;
    private double dfCostoOpMax = 4.0;

    // Constructor por defecto
    public Configuracion() {}

    // Getters y Setters
    public double getPrecioSubvencionado() { return precioSubvencionado; }
    public void setPrecioSubvencionado(double precioSubvencionado) { this.precioSubvencionado = precioSubvencionado; }

    public double getPrecioInternacional() { return precioInternacional; }
    public void setPrecioInternacional(double precioInternacional) { this.precioInternacional = precioInternacional; }

    public double getIncrementoTrimestral() { return incrementoTrimestral; }
    public void setIncrementoTrimestral(double incrementoTrimestral) { this.incrementoTrimestral = incrementoTrimestral; }

    public int getNumSurtidoresSubv() { return numSurtidoresSubv; }
    public void setNumSurtidoresSubv(int numSurtidoresSubv) { this.numSurtidoresSubv = numSurtidoresSubv; }

    public double getCapacidadTanque() { return capacidadTanque; }
    public void setCapacidadTanque(double capacidadTanque) { this.capacidadTanque = capacidadTanque; }

    public double getUmbralAbastecimiento() { return umbralAbastecimiento; }
    public void setUmbralAbastecimiento(double umbralAbastecimiento) { this.umbralAbastecimiento = umbralAbastecimiento; }

    public double getIntervaloAbastecimiento() { return intervaloAbastecimiento; }
    public void setIntervaloAbastecimiento(double intervaloAbastecimiento) { this.intervaloAbastecimiento = intervaloAbastecimiento; }

    public double getTiempoLimite() { return tiempoLimite; }
    public void setTiempoLimite(double tiempoLimite) { this.tiempoLimite = tiempoLimite; }

    public int getMaxVehiculos() { return maxVehiculos; }
    public void setMaxVehiculos(int maxVehiculos) { this.maxVehiculos = maxVehiculos; }

    public double getLambdaLlegadas() { return lambdaLlegadas; }
    public void setLambdaLlegadas(double lambdaLlegadas) { this.lambdaLlegadas = lambdaLlegadas; }

    // Getters/Setters Costos de Oportunidad
    public double getTpCostoOpBase() { return tpCostoOpBase; }
    public void setTpCostoOpBase(double tpCostoOpBase) { this.tpCostoOpBase = tpCostoOpBase; }
    public double getTpCostoOpModa() { return tpCostoOpModa; }
    public void setTpCostoOpModa(double tpCostoOpModa) { this.tpCostoOpModa = tpCostoOpModa; }
    public double getTpCostoOpMax() { return tpCostoOpMax; }
    public void setTpCostoOpMax(double tpCostoOpMax) { this.tpCostoOpMax = tpCostoOpMax; }

    public double getMpCostoOpBase() { return mpCostoOpBase; }
    public void setMpCostoOpBase(double mpCostoOpBase) { this.mpCostoOpBase = mpCostoOpBase; }
    public double getMpCostoOpModa() { return mpCostoOpModa; }
    public void setMpCostoOpModa(double mpCostoOpModa) { this.mpCostoOpModa = mpCostoOpModa; }
    public double getMpCostoOpMax() { return mpCostoOpMax; }
    public void setMpCostoOpMax(double mpCostoOpMax) { this.mpCostoOpMax = mpCostoOpMax; }

    public double getApCostoOpBase() { return apCostoOpBase; }
    public void setApCostoOpBase(double apCostoOpBase) { this.apCostoOpBase = apCostoOpBase; }
    public double getApCostoOpModa() { return apCostoOpModa; }
    public void setApCostoOpModa(double apCostoOpModa) { this.apCostoOpModa = apCostoOpModa; }
    public double getApCostoOpMax() { return apCostoOpMax; }
    public void setApCostoOpMax(double apCostoOpMax) { this.apCostoOpMax = apCostoOpMax; }

    public double getMoCostoOpBase() { return moCostoOpBase; }
    public void setMoCostoOpBase(double moCostoOpBase) { this.moCostoOpBase = moCostoOpBase; }
    public double getMoCostoOpModa() { return moCostoOpModa; }
    public void setMoCostoOpModa(double moCostoOpModa) { this.moCostoOpModa = moCostoOpModa; }
    public double getMoCostoOpMax() { return moCostoOpMax; }
    public void setMoCostoOpMax(double moCostoOpMax) { this.moCostoOpMax = moCostoOpMax; }

    public double getCmCostoOpBase() { return cmCostoOpBase; }
    public void setCmCostoOpBase(double cmCostoOpBase) { this.cmCostoOpBase = cmCostoOpBase; }
    public double getCmCostoOpModa() { return cmCostoOpModa; }
    public void setCmCostoOpModa(double cmCostoOpModa) { this.cmCostoOpModa = cmCostoOpModa; }
    public double getCmCostoOpMax() { return cmCostoOpMax; }
    public void setCmCostoOpMax(double cmCostoOpMax) { this.cmCostoOpMax = cmCostoOpMax; }

    public double getDfCostoOpBase() { return dfCostoOpBase; }
    public void setDfCostoOpBase(double dfCostoOpBase) { this.dfCostoOpBase = dfCostoOpBase; }
    public double getDfCostoOpModa() { return dfCostoOpModa; }
    public void setDfCostoOpModa(double dfCostoOpModa) { this.dfCostoOpModa = dfCostoOpModa; }
    public double getDfCostoOpMax() { return dfCostoOpMax; }
    public void setDfCostoOpMax(double dfCostoOpMax) { this.dfCostoOpMax = dfCostoOpMax; }
}
