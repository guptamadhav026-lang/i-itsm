package com.itsm.web;

import com.itsm.model.Priority;
import com.itsm.security.CurrentUser;
import com.itsm.service.AuditService;
import com.itsm.service.CatalogService;
import com.itsm.service.UserService;
import com.itsm.strategy.assignment.AssignmentStrategyRegistry;
import com.itsm.strategy.priority.PriorityStrategyRegistry;
import com.itsm.web.dto.AuditRecordDto;
import com.itsm.web.dto.CategoryDto;
import com.itsm.web.dto.CategoryRequest;
import com.itsm.web.dto.CreateUserRequest;
import com.itsm.web.dto.ServiceDto;
import com.itsm.web.dto.ServiceRequest;
import com.itsm.web.dto.SlaPolicyDto;
import com.itsm.web.dto.SlaPolicyRequest;
import com.itsm.web.dto.StrategyDto;
import com.itsm.web.dto.StrategyRequest;
import com.itsm.web.dto.UpdateTechnicianRequest;
import com.itsm.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Administration: users, services, categories, SLA policies, strategies and the global audit log. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "5. Administration")
public class AdminController {

    private final UserService userService;
    private final CatalogService catalogService;
    private final AuditService auditService;
    private final AssignmentStrategyRegistry assignmentStrategies;
    private final PriorityStrategyRegistry priorityStrategies;
    private final CurrentUser currentUser;

    public AdminController(UserService userService, CatalogService catalogService, AuditService auditService,
                           AssignmentStrategyRegistry assignmentStrategies,
                           PriorityStrategyRegistry priorityStrategies, CurrentUser currentUser) {
        this.userService = userService;
        this.catalogService = catalogService;
        this.auditService = auditService;
        this.assignmentStrategies = assignmentStrategies;
        this.priorityStrategies = priorityStrategies;
        this.currentUser = currentUser;
    }

    // Users

    @GetMapping("/users")
    public List<UserDto> users() {
        return userService.findAll().stream().map(UserDto::from).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an employee, technician or administrator")
    public UserDto createUser(@Valid @RequestBody CreateUserRequest request) {
        return UserDto.from(userService.create(request));
    }

    @PutMapping("/users/{id}/active")
    @Operation(summary = "Activate or deactivate an account")
    public UserDto setActive(@PathVariable Long id, @RequestParam boolean active, Authentication auth) {
        return UserDto.from(userService.setActive(id, active, currentUser.from(auth)));
    }

    @GetMapping("/technicians")
    public List<UserDto> technicians() {
        return userService.findTechnicians().stream().map(UserDto::from).toList();
    }

    @PutMapping("/technicians/{id}")
    @Operation(summary = "Update a technician's skills, experience, capacity, availability")
    public UserDto updateTechnician(@PathVariable Long id, @Valid @RequestBody UpdateTechnicianRequest request) {
        return UserDto.from(userService.updateTechnician(id, request));
    }

    // Services & categories

    @GetMapping("/services")
    public List<ServiceDto> services() {
        return catalogService.allServices().stream().map(ServiceDto::from).toList();
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto createService(@Valid @RequestBody ServiceRequest request) {
        return ServiceDto.from(catalogService.createService(request));
    }

    @PutMapping("/services/{id}")
    public ServiceDto updateService(@PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        return ServiceDto.from(catalogService.updateService(id, request));
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.allCategories().stream().map(CategoryDto::from).toList();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a category at runtime (no code change needed)")
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest request) {
        return CategoryDto.from(catalogService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return CategoryDto.from(catalogService.updateCategory(id, request));
    }

    // SLA policies

    @GetMapping("/sla-policies")
    public List<SlaPolicyDto> slaPolicies() {
        return catalogService.slaPolicies().stream().map(SlaPolicyDto::from).toList();
    }

    @PutMapping("/sla-policies/{priority}")
    @Operation(summary = "Change response/resolution times for a priority")
    public SlaPolicyDto updateSlaPolicy(@PathVariable Priority priority,
                                        @Valid @RequestBody SlaPolicyRequest request) {
        return SlaPolicyDto.from(catalogService.updateSlaPolicy(priority, request));
    }

    // Strategies

    @GetMapping("/strategies/assignment")
    public List<StrategyDto> assignmentStrategies() {
        return assignmentStrategies.getAll().stream()
                .map(s -> StrategyDto.from(s, assignmentStrategies.getActiveName())).toList();
    }

    @PutMapping("/strategies/assignment")
    @Operation(summary = "Switch assignment strategy at runtime: SKILL_BASED, LOAD_BASED, ROUND_ROBIN, SMART")
    public List<StrategyDto> selectAssignmentStrategy(@Valid @RequestBody StrategyRequest request) {
        assignmentStrategies.setActive(request.name());
        return assignmentStrategies();
    }

    @GetMapping("/strategies/priority")
    public List<StrategyDto> priorityStrategies() {
        return priorityStrategies.getAll().stream()
                .map(s -> StrategyDto.from(s, priorityStrategies.getActiveName())).toList();
    }

    @PutMapping("/strategies/priority")
    @Operation(summary = "Switch priority strategy at runtime: WEIGHTED, ITIL_MATRIX")
    public List<StrategyDto> selectPriorityStrategy(@Valid @RequestBody StrategyRequest request) {
        priorityStrategies.setActive(request.name());
        return priorityStrategies();
    }

    // Audit

    @GetMapping("/audit")
    @Operation(summary = "Most recent audit records across all incidents")
    public List<AuditRecordDto> recentAudit(@RequestParam(defaultValue = "100") int limit) {
        return auditService.recent(limit).stream().map(AuditRecordDto::from).toList();
    }
}
