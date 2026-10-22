package com.itsm.web;

import com.itsm.intelligence.CategorySuggestion;
import com.itsm.service.CatalogService;
import com.itsm.service.IncidentService;
import com.itsm.service.ReportService;
import com.itsm.service.SlaService;
import com.itsm.web.dto.CategoryDto;
import com.itsm.web.dto.CategorySuggestionRequest;
import com.itsm.web.dto.ServiceDto;
import com.itsm.web.dto.SlaPolicyDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Read-only lists every logged-in user needs, e.g. to fill the "report incident" form. */
@RestController
@RequestMapping("/api/catalog")
@Tag(name = "3. Catalog")
public class CatalogController {

    private final CatalogService catalogService;
    private final IncidentService incidentService;
    private final ReportService reportService;
    private final SlaService slaService;

    public CatalogController(CatalogService catalogService, IncidentService incidentService,
                             ReportService reportService, SlaService slaService) {
        this.catalogService = catalogService;
        this.incidentService = incidentService;
        this.reportService = reportService;
        this.slaService = slaService;
    }

    @GetMapping("/services")
    public List<ServiceDto> services() {
        return catalogService.activeServices().stream().map(ServiceDto::from).toList();
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.activeCategories().stream().map(CategoryDto::from).toList();
    }

    @GetMapping("/service-status")
    @Operation(summary = "Services that have open incidents right now (counts only)")
    public List<ReportService.ServiceStatus> serviceStatus() {
        return reportService.serviceStatus();
    }

    @GetMapping("/services/{id}/sla")
    @Operation(summary = "The SLA targets that apply to a service, P1 to P4 (its own, or the defaults)")
    public List<SlaPolicyDto> slaTargets(@PathVariable Long id) {
        return slaService.policiesFor(catalogService.getService(id)).stream().map(SlaPolicyDto::from).toList();
    }

    @PostMapping("/suggest-category")
    @Operation(summary = "Suggest a category from free text (204 if nothing matches)")
    public ResponseEntity<CategorySuggestion> suggestCategory(@Valid @RequestBody CategorySuggestionRequest request) {
        return incidentService.suggestCategory(request.text())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
