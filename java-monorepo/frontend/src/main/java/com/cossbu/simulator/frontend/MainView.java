package com.cossbu.simulator.frontend;

import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.combobox.ComboBox;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.grid.Grid;
import com.vaadin.flow.component.html.Anchor;
import com.vaadin.flow.component.html.H2;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.NumberField;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.server.StreamResource;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Vaadin 24 Main UI View.
 * Implements a reactive, 100% Java interface.
 * Design inspired by the Coss Bu discrete event station simulator.
 */
@Route("")
public class MainView extends VerticalLayout {

    // Simular modelo local para propósitos de interfaz autónoma
    private double lambda = 0.3425;
    private double capacidadTanque = 10000.0;
    private double umbralAbastecimiento = 500.0;
    private int escalaLanzamientos = 1000;

    private NumberField lambdaInput;
    private NumberField capacidadInput;
    private NumberField umbralInput;
    private ComboBox<Integer> escalaSelect;

    private Grid<MockEvento> gridEventos;
    private List<MockEvento> eventList = new ArrayList<>();

    public MainView() {
        setSizeFull();
        setSpacing(false);
        setPadding(false);

        // Header
        HorizontalLayout header = new HorizontalLayout();
        header.setWidthFull();
        header.setPadding(true);
        header.getStyle().set("background-color", "#1f2937").set("color", "white");
        H2 title = new H2("Simulador de Estación de Servicio - Vaadin Reactivo");
        title.getStyle().set("margin", "0");
        header.add(title);
        add(header);

        // Main Layout containing Sidebar and Work Area
        HorizontalLayout mainContent = new HorizontalLayout();
        mainContent.setSizeFull();
        mainContent.setSpacing(true);

        // 1. SIDEBAR (300px)
        VerticalLayout sidebar = new VerticalLayout();
        sidebar.setWidth("300px");
        sidebar.setHeightFull();
        sidebar.getStyle().set("background-color", "#f3f4f6").set("border-right", "1px solid #e5e7eb");
        sidebar.setPadding(true);

        H3 sidebarTitle = new H3("Parámetros del Sistema");
        sidebarTitle.getStyle().set("margin-top", "0");

        lambdaInput = new NumberField("Lambda de Llegadas (veh/min)");
        lambdaInput.setValue(lambda);
        lambdaInput.setWidthFull();

        capacidadInput = new NumberField("Capacidad Tanque (L)");
        capacidadInput.setValue(capacidadTanque);
        capacidadInput.setWidthFull();

        umbralInput = new NumberField("Umbral Abastecimiento (L)");
        umbralInput.setValue(umbralAbastecimiento);
        umbralInput.setWidthFull();

        escalaSelect = new ComboBox<>("Escala de Corridas (Max)");
        escalaSelect.setItems(1000, 2000, 3000, 10000, 100000, 1000000);
        escalaSelect.setValue(escalaLanzamientos);
        escalaSelect.setWidthFull();

        Button btnSimular = new Button("Ejecutar Simulación");
        btnSimular.getStyle().set("background-color", "#2563eb").set("color", "white");
        btnSimular.setWidthFull();
        btnSimular.addClickListener(e -> ejecutarLanzamiento());

        Button btnReiniciar = new Button("Restaurar Parámetros");
        btnReiniciar.getStyle().set("background-color", "#dc2626").set("color", "white");
        btnReiniciar.setWidthFull();
        btnReiniciar.addClickListener(e -> restaurarFabrica());

        sidebar.add(sidebarTitle, lambdaInput, capacidadInput, umbralInput, escalaSelect, btnSimular, btnReiniciar);

        // 2. WORK AREA
        VerticalLayout workArea = new VerticalLayout();
        workArea.setSizeFull();
        workArea.setPadding(true);

        H3 statsTitle = new H3("Métricas y Resultados Generales");
        workArea.add(statsTitle);

        // KPI Badges
        HorizontalLayout kpiRow = new HorizontalLayout();
        kpiRow.setWidthFull();
        kpiRow.setSpacing(true);

        Span kpiAtendidos = new Span("Vehículos Atendidos: 0");
        kpiAtendidos.getStyle().set("background-color", "#e0f2fe").set("color", "#0369a1").set("padding", "10px").set("border-radius", "6px").set("font-weight", "bold");

        Span kpiEspera = new Span("Espera Promedio: 0.00 min");
        kpiEspera.getStyle().set("background-color", "#fef3c7").set("color", "#b45309").set("padding", "10px").set("border-radius", "6px").set("font-weight", "bold");

        Span kpiRedirigidos = new Span("Redirigidos al Int: 0");
        kpiRedirigidos.getStyle().set("background-color", "#f3e8ff").set("color", "#6b21a8").set("padding", "10px").set("border-radius", "6px").set("font-weight", "bold");

        kpiRow.add(kpiAtendidos, kpiEspera, kpiRedirigidos);
        workArea.add(kpiRow);

        // Grid de Eventos
        H3 gridTitle = new H3("Grid de Eventos en Tiempo Real (Coss Bu)");
        gridEventos = new Grid<>();
        gridEventos.addColumn(MockEvento::getIdVehiculo).setHeader("ID Vehículo").setWidth("100px");
        gridEventos.addColumn(MockEvento::getTiempo).setHeader("Tiempo (min)").setWidth("120px");
        gridEventos.addColumn(MockEvento::getTipo).setHeader("Tipo Evento").setWidth("150px");
        gridEventos.addColumn(MockEvento::getSurtidor).setHeader("Surtidor").setWidth("120px");
        gridEventos.addColumn(MockEvento::getObservaciones).setHeader("Observaciones").setAutoWidth(true);
        gridEventos.setHeight("350px");

        // ValueChangeListener for Popup Dialog
        gridEventos.asSingleSelect().addValueChangeListener(event -> {
            if (event.getValue() != null) {
                mostrarDetallesEvento(event.getValue());
            }
        });

        // POI Export Button
        StreamResource excelResource = new StreamResource("reporte_simulacion.xlsx", () -> {
            // Genera dummy byte stream simulating the Excel generated by Apache POI
            return new ByteArrayInputStream("Mock excel data compiled via Apache POI in backend".getBytes());
        });
        Anchor downloadAnchor = new Anchor(excelResource, "");
        Button btnExportar = new Button("Exportar a Excel (Apache POI)");
        btnExportar.getStyle().set("background-color", "#16a34a").set("color", "white");
        downloadAnchor.add(btnExportar);

        workArea.add(gridTitle, gridEventos, downloadAnchor);

        mainContent.add(sidebar, workArea);
        add(mainContent);

        // Seed initial mock grid data
        cargarMockDatos();
    }

    private void ejecutarLanzamiento() {
        lambda = lambdaInput.getValue() != null ? lambdaInput.getValue() : 0.3425;
        capacidadTanque = capacidadInput.getValue() != null ? capacidadInput.getValue() : 10000.0;
        umbralAbastecimiento = umbralInput.getValue() != null ? umbralInput.getValue() : 500.0;
        escalaLanzamientos = escalaSelect.getValue() != null ? escalaSelect.getValue() : 1000;

        // Simulate new state recalculating events
        eventList.clear();
        eventList.add(new MockEvento("V-1", 2.92, "LLEGADA", "Surtidor 1", "Tipo: Transporte Pesado (R=0.15). Vol=320 L. Costo_op=3.2 Bs/min. Decisión: SUBVENCIONADO."));
        eventList.add(new MockEvento("V-2", 5.84, "LLEGADA", "Surtidor 2", "Tipo: Minibús (R=0.35). Vol=45 L. Costo_op=1.1. Decisión: SUBVENCIONADO."));
        eventList.add(new MockEvento("V-3", 8.76, "LLEGADA", "Cola SUBV", "Tipo: Auto Particular (R=0.52). Vol=38 L. Costo_op=0.5. Decisión: SUBVENCIONADO."));
        eventList.add(new MockEvento("V-2", 9.14, "FIN_CARGA", "Surtidor 2", "Se libera Surtidor 2. Se desencola V-3 e inicia servicio."));
        
        gridEventos.setItems(eventList);
    }

    private void restaurarFabrica() {
        lambdaInput.setValue(0.3425);
        capacidadInput.setValue(10000.0);
        umbralInput.setValue(500.0);
        escalaSelect.setValue(1000);
        cargarMockDatos();
    }

    private void cargarMockDatos() {
        eventList.clear();
        eventList.add(new MockEvento("—", 0.00, "INICIO", "—", "Inicialización del sistema con 10,000L de combustible. Se agenda 1ª llegada a t=2.92 min."));
        eventList.add(new MockEvento("V-1", 2.92, "LLEGADA", "Surtidor 1", "Tipo: Transporte Pesado (R=0.15). Vol=320 L. Costo_op=3.2. Decisión: SUBV (costo_subv=2227.2 < 4000). Surtidor 1 libre."));
        eventList.add(new MockEvento("V-2", 5.84, "LLEGADA", "Surtidor 2", "Tipo: Minibús (R=0.35). Vol=45 L. Costo_op=1.1. Decisión: SUBV. Surtidor 2 libre."));
        eventList.add(new MockEvento("V-3", 8.76, "LLEGADA", "Cola SUBV", "Tipo: Auto Particular (R=0.52). Vol=38 L. Costo_op=0.5. Decisión: SUBV (Surtidor 1 y 2 ocupados, encola en SUBV)."));
        eventList.add(new MockEvento("V-2", 9.14, "FIN_CARGA", "Surtidor 2", "Se libera Surtidor 2. Se desencola V-3 e inicia carga en Surtidor 2. Fin carga t=12.44."));
        
        gridEventos.setItems(eventList);
    }

    private void mostrarDetallesEvento(MockEvento ev) {
        Dialog dialog = new Dialog();
        dialog.setHeaderTitle("Análisis Pormenorizado del Evento - Coss Bu");

        VerticalLayout dialogLayout = new VerticalLayout();
        dialogLayout.setSpacing(true);
        dialogLayout.setPadding(true);

        dialogLayout.add(new Paragraph("Asociación: " + ev.getIdVehiculo()));
        dialogLayout.add(new Paragraph("Tiempo de simulación: " + ev.getTiempo() + " minutos."));
        dialogLayout.add(new Paragraph("Tipo de Evento: " + ev.getTipo()));
        dialogLayout.add(new Paragraph("Ubicación: " + ev.getSurtidor()));
        
        H3 mathTitle = new H3("Lógica de Decisión Económica:");
        dialogLayout.add(mathTitle);
        
        Paragraph mathExplanation = new Paragraph(
            "Cálculo matemático: Costo_Subvencionado = (Volumen * Precio_Subvencionado) + (Tiempo_Espera_Est_Subv * Costo_Oportunidad). " +
            "Si Costo_Subvencionado < Costo_Internacional, el conductor elige quedarse en la cola local, de lo contrario se redirige voluntariamente al Surtidor Internacional (5) con tarifa premium de 12.50 Bs/L."
        );
        dialogLayout.add(mathExplanation);
        dialogLayout.add(new Paragraph("Detalles del caso: " + ev.getObservaciones()));

        Button btnCerrar = new Button("Entendido", click -> dialog.close());
        dialog.getFooter().add(btnCerrar);

        dialog.add(dialogLayout);
        dialog.open();
    }

    // Clase auxiliar mock para representar datos de la grid
    public static class MockEvento {
        private String idVehiculo;
        private double tiempo;
        private String tipo;
        private String surtidor;
        private String observaciones;

        public MockEvento(String idVehiculo, double tiempo, String tipo, String surtidor, String observaciones) {
            this.idVehiculo = idVehiculo;
            this.tiempo = tiempo;
            this.tipo = tipo;
            this.surtidor = surtidor;
            this.observaciones = observaciones;
        }

        public String getIdVehiculo() { return idVehiculo; }
        public double getTiempo() { return tiempo; }
        public String getTipo() { return tipo; }
        public String getSurtidor() { return surtidor; }
        public String getObservaciones() { return observaciones; }
    }
}
