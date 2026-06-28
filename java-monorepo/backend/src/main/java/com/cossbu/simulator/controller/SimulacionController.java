package com.cossbu.simulator.controller;

import com.cossbu.simulator.model.Configuracion;
import com.cossbu.simulator.model.Evento;
import com.cossbu.simulator.model.ResultadoSimulacion;
import com.cossbu.simulator.service.SimuladorService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/simulacion")
@CrossOrigin(origins = "*")
public class SimulacionController {

    private final SimuladorService simuladorService;

    public SimulacionController(SimuladorService simuladorService) {
        this.simuladorService = simuladorService;
    }

    @PostMapping("/ejecutar")
    public ResponseEntity<ResultadoSimulacion> ejecutar(@RequestBody Configuracion config, @RequestParam(required = false) Long semilla) {
        ResultadoSimulacion resultado = simuladorService.ejecutarSimulacion(config, semilla);
        return ResponseEntity.ok(resultado);
    }

    @PostMapping("/exportar")
    public ResponseEntity<byte[]> exportarExcel(@RequestBody Configuracion config, @RequestParam(required = false) Long semilla) throws IOException {
        ResultadoSimulacion resultado = simuladorService.ejecutarSimulacion(config, semilla);
        List<Evento> eventos = resultado.getEventosHistoricos();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Historial de Eventos");

            // Crear fuentes
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);

            Font dataFont = workbook.createFont();
            dataFont.setFontHeightInPoints((short) 10);

            // Crear estilos
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle decimalStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            decimalStyle.setDataFormat(format.getFormat("#,##0.00"));
            decimalStyle.setFont(dataFont);
            decimalStyle.setBorderBottom(BorderStyle.THIN);
            decimalStyle.setBorderTop(BorderStyle.THIN);
            decimalStyle.setBorderLeft(BorderStyle.THIN);
            decimalStyle.setBorderRight(BorderStyle.THIN);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setFont(dataFont);
            textStyle.setBorderBottom(BorderStyle.THIN);
            textStyle.setBorderTop(BorderStyle.THIN);
            textStyle.setBorderLeft(BorderStyle.THIN);
            textStyle.setBorderRight(BorderStyle.THIN);

            CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setFont(dataFont);
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setBorderBottom(BorderStyle.THIN);
            centerStyle.setBorderTop(BorderStyle.THIN);
            centerStyle.setBorderLeft(BorderStyle.THIN);
            centerStyle.setBorderRight(BorderStyle.THIN);

            // Cabeceras en español
            Row headerRow = sheet.createRow(0);
            String[] cabeceras = {
                "ID Vehículo", 
                "Reloj de Simulación (min)", 
                "Marca de Tiempo (hh:mm:ss)", 
                "Tipo de Evento", 
                "Surtidor Asociado", 
                "Análisis Técnico y Decisiones Estocásticas"
            };

            for (int i = 0; i < cabeceras.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(cabeceras[i]);
                cell.setCellStyle(headerStyle);
            }

            // Llenar datos de eventos
            int rowIdx = 1;
            for (Evento e : eventos) {
                Row row = sheet.createRow(rowIdx++);
                
                // ID Vehículo
                Cell c0 = row.createCell(0);
                c0.setCellValue(e.getIdVehiculo() > 0 ? "V-" + e.getIdVehiculo() : "—");
                c0.setCellStyle(centerStyle);
                
                // Tiempo de Simulación en min
                Cell c1 = row.createCell(1);
                c1.setCellValue(e.getTiempo());
                c1.setCellStyle(decimalStyle);

                // Marca de tiempo en formato hh:mm:ss
                Cell c2 = row.createCell(2);
                double t = e.getTiempo();
                int horas = (int) (t / 60);
                int minutos = (int) (t % 60);
                int segundos = (int) ((t * 60) % 60);
                String timeFormatted = String.format("%02d:%02d:%02d", horas, minutos, segundos);
                c2.setCellValue(timeFormatted);
                c2.setCellStyle(centerStyle);

                // Tipo de Evento
                Cell c3 = row.createCell(3);
                c3.setCellValue(e.getTipo());
                c3.setCellStyle(centerStyle);

                // Surtidor
                Cell c4 = row.createCell(4);
                c4.setCellValue(e.getIdSurtidor() > 0 ? "Surtidor " + e.getIdSurtidor() : "—");
                c4.setCellStyle(centerStyle);

                // Observaciones
                Cell c5 = row.createCell(5);
                c5.setCellValue(e.getObservaciones() != null ? e.getObservaciones() : "Sin observaciones");
                c5.setCellStyle(textStyle);
            }

            // Auto-ajustar ancho de columnas
            for (int i = 0; i < cabeceras.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=simulacion_eventos_coss_bu.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}
