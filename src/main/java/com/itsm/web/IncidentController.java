package com.itsm.web;

import com.itsm.intelligence.SimilarIncident;
import com.itsm.intelligence.SuggestedResolution;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;
import com.itsm.model.User;
import com.itsm.security.CurrentUser;
import com.itsm.service.AuditService;
import com.itsm.service.IncidentSearchCriteria;
import com.itsm.service.IncidentService;
import com.itsm.service.SearchService;
import com.itsm.strategy.assignment.ScoredTechnician;
import com.itsm.web.dto.AssignRequest;
import com.itsm.web.dto.AuditRecordDto;
import com.itsm.web.dto.CreateIncidentRequest;
import com.itsm.web.dto.FeedbackRequest;
import com.itsm.web.dto.IncidentDetailDto;
import com.itsm.web.dto.IncidentSummaryDto;
import com.itsm.web.dto.NoteRequest;
import com.itsm.web.dto.ReassessRequest;
import com.itsm.web.dto.ReopenRequest;
import com.itsm.web.dto.ResolveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * The incident lifecycle as REST endpoints. Who may call what is checked twice:
 * by role here (@PreAuthorize) and by ownership in IncidentService (e.g. only the ASSIGNED technician).
 */
@RestController
@RequestMapping("/api/incidents")
@Tag(name = "2. Incidents")
public class IncidentController {

    private final IncidentService incidentService;
    private final SearchService searchService;
    private final AuditService auditService;
    private final IncidentViews views;
    private final CurrentUser currentUser;

    public IncidentController(IncidentService incidentService, SearchService searchService,
                              AuditService auditService, IncidentViews views, CurrentUser currentUser) {
        this.incidentService = incidentService;
        this.searchService = searchService;
        this.auditService = auditService;
        this.views = views;
        this.currentUser = currentUser;
    }

    // Report & view

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYEE','ADMIN')")
    @Operation(summary = "Report a new incident (auto categorised, prioritised, SLA applied and assigned)")
    public IncidentDetailDto create(@Valid @RequestBody CreateIncidentRequest request, Authentication auth) {
        return views.detail(incidentService.create(user(auth), request));
    }

    @GetMapping
    @Operation(summary = "My incidents: reported (employee), assigned (technician) or all (admin)")
    public List<IncidentSummaryDto> list(Authentication auth) {
        return views.summaries(incidentService.listFor(user(auth)));
    }

    @GetMapping("/search")
    @Operation(summary = "Search incidents by any combination of criteria (employees only see their own)")
    public List<IncidentSummaryDto> search(
            @RequestParam(required = false) String reference,
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long technicianId,
            @RequestParam(required = false) Long reporterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo,
            @RequestParam(required = false) SlaState slaState,
            @RequestParam(required = false) String keyword,
            Authentication auth) {
        IncidentSearchCriteria criteria = new IncidentSearchCriteria(reference, status, priority, categoryId,
                serviceId, technicianId, reporterId, createdFrom, createdTo, slaState, keyword);
        return views.summaries(searchService.search(criteria, user(auth)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Full details of one incident")
    public IncidentDetailDto get(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.getVisible(id, user(auth)));
    }

    @GetMapping("/{id}/audit")
    @Operation(summary = "Audit trail (history) of one incident")
    public List<AuditRecordDto> audit(@PathVariable Long id, Authentication auth) {
        return auditService.forIncident(id, user(auth)).stream().map(AuditRecordDto::from).toList();
    }

    // Assignment (admin)

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign or reassign to a specific technician")
    public IncidentDetailDto assign(@PathVariable Long id, @Valid @RequestBody AssignRequest request,
                                    Authentication auth) {
        return views.detail(incidentService.assign(id, request.technicianId(), user(auth)));
    }

    @PostMapping("/{id}/auto-assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign using the active assignment strategy")
    public IncidentDetailDto autoAssign(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.autoAssign(id, user(auth)));
    }

    @GetMapping("/{id}/recommended-technicians")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Smart recommendation: technicians ranked with reasons")
    public List<ScoredTechnician> recommendedTechnicians(@PathVariable Long id) {
        return incidentService.recommendTechnicians(id);
    }

    // Technician work

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public IncidentDetailDto acknowledge(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.acknowledge(id, user(auth)));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    @Operation(summary = "Start investigation (IN_PROGRESS)")
    public IncidentDetailDto start(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.startInvestigation(id, user(auth)));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    @Operation(summary = "Add an investigation note")
    public IncidentDetailDto addNote(@PathVariable Long id, @Valid @RequestBody NoteRequest request,
                                     Authentication auth) {
        return views.detail(incidentService.addInvestigationNote(id, user(auth), request.text()));
    }

    @PostMapping("/{id}/info-request")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    @Operation(summary = "Ask the reporter for more information")
    public IncidentDetailDto requestInfo(@PathVariable Long id, @Valid @RequestBody NoteRequest request,
                                         Authentication auth) {
        return views.detail(incidentService.requestInformation(id, user(auth), request.text()));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public IncidentDetailDto resolve(@PathVariable Long id, @Valid @RequestBody ResolveRequest request,
                                     Authentication auth) {
        return views.detail(incidentService.resolve(id, user(auth), request.resolution()));
    }

    @PostMapping("/{id}/reassess")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    @Operation(summary = "Change impact/urgency/affected users; priority and SLA are recalculated")
    public IncidentDetailDto reassess(@PathVariable Long id, @Valid @RequestBody ReassessRequest request,
                                      Authentication auth) {
        return views.detail(incidentService.reassess(id, user(auth), request.impact(), request.urgency(),
                request.affectedUsers()));
    }

    // Reporter actions

    @PostMapping("/{id}/info-response")
    @Operation(summary = "Reporter answers an information request")
    public IncidentDetailDto provideInfo(@PathVariable Long id, @Valid @RequestBody NoteRequest request,
                                         Authentication auth) {
        return views.detail(incidentService.provideInformation(id, user(auth), request.text()));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "Add a comment (anyone who can see the incident)")
    public IncidentDetailDto comment(@PathVariable Long id, @Valid @RequestBody NoteRequest request,
                                     Authentication auth) {
        return views.detail(incidentService.comment(id, user(auth), request.text()));
    }

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Reporter rejects the resolution: back to IN_PROGRESS")
    public IncidentDetailDto reopen(@PathVariable Long id, @Valid @RequestBody ReopenRequest request,
                                    Authentication auth) {
        return views.detail(incidentService.reopen(id, user(auth), request.reason()));
    }

    @PostMapping("/{id}/verify")
    @Operation(summary = "Reporter confirms the fix works")
    public IncidentDetailDto verify(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.verify(id, user(auth)));
    }

    @PostMapping("/{id}/close")
    public IncidentDetailDto close(@PathVariable Long id, Authentication auth) {
        return views.detail(incidentService.close(id, user(auth)));
    }

    @PostMapping("/{id}/feedback")
    @Operation(summary = "Reporter rates the resolution 1-5")
    public IncidentDetailDto feedback(@PathVariable Long id, @Valid @RequestBody FeedbackRequest request,
                                      Authentication auth) {
        return views.detail(incidentService.giveFeedback(id, user(auth), request.rating(), request.comment()));
    }

    // Intelligent features

    @GetMapping("/{id}/similar")
    @Operation(summary = "Open incidents that look like the same problem")
    public List<SimilarIncident> similar(@PathVariable Long id, Authentication auth) {
        return incidentService.similarIncidents(id, user(auth));
    }

    @GetMapping("/{id}/suggested-resolutions")
    @Operation(summary = "Fixes that worked for similar past incidents")
    public List<SuggestedResolution> suggestedResolutions(@PathVariable Long id, Authentication auth) {
        return incidentService.suggestedResolutions(id, user(auth));
    }

    private User user(Authentication auth) {
        return currentUser.from(auth);
    }
}
