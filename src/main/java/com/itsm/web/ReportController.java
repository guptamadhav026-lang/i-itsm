package com.itsm.web;

import com.itsm.intelligence.CorrelationCluster;
import com.itsm.intelligence.SlaRisk;
import com.itsm.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "6. Reports & dashboards")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/overview")
    @Operation(summary = "Totals, SLA compliance, average resolution time, counts by status and priority")
    public ReportService.Overview overview() {
        return reportService.overview();
    }

    @GetMapping("/technician-workload")
    public List<ReportService.TechnicianWorkload> workload() {
        return reportService.technicianWorkload();
    }

    @GetMapping("/services")
    @Operation(summary = "Which services have the most incidents")
    public List<ReportService.CountRow> byService() {
        return reportService.byService();
    }

    @GetMapping("/categories")
    public List<ReportService.CountRow> byCategory() {
        return reportService.byCategory();
    }

    @GetMapping("/sla-by-priority")
    @Operation(summary = "Average response and resolution time and SLA breaches for each priority")
    public List<ReportService.SlaByPriority> slaByPriority() {
        return reportService.slaByPriority();
    }

    @GetMapping("/sla-risk")
    @Operation(summary = "Open incidents most likely to breach their SLA (risk score 0-100)")
    public List<SlaRisk> slaRisk() {
        return reportService.slaRisks();
    }

    @GetMapping("/correlations")
    @Operation(summary = "Groups of recent open incidents on the same service (possible major incident)")
    public List<CorrelationCluster> correlations() {
        return reportService.correlations();
    }
}
