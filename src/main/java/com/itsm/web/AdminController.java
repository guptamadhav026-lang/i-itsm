package com.itsm.web;

import com.itsm.integration.GeminiCategoryAdvisor;
import com.itsm.model.Priority;
import com.itsm.security.CurrentUser;
import com.itsm.service.AuditService;
import com.itsm.service.CatalogService;
import com.itsm.service.StrategyService;
import com.itsm.service.UserService;
import com.itsm.strategy.assignment.AssignmentStrategyRegistry;
import com.itsm.strategy.priority.PriorityStrategyRegistry;
import com.itsm.web.dto.AuditRecordDto;
import com.itsm.web.dto.CategoryDto;
import com.itsm.web.dto.CategoryRequest;
import com.itsm.web.dto.CreateUserRequest;
import com.itsm.web.dto.PasswordResetRequest;
import com.itsm.web.dto.ServiceDto;
import com.itsm.web.dto.ServiceRequest;
import com.itsm.web.dto.ServiceSlaPolicyRequest;
import com.itsm.web.dto.SlaPolicyDto;
import com.itsm.web.dto.SlaPolicyRequest;
import com.itsm.web.dto.StrategyDto;
import com.itsm.web.dto.StrategyRequest;
import com.itsm.web.dto.UpdateTechnicianRequest;
import com.itsm.web.dto.UpdateUserRequest;
import com.itsm.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final StrategyService strategyService;
    private final CurrentUser currentUser;
    private final GeminiCategoryAdvisor gemini;

    public AdminController(UserService userService, CatalogService catalogService, AuditService auditService,
                           AssignmentStrategyRegistry assignmentStrategies,
                           PriorityStrategyRegistry priorityStrategies, StrategyService strategyService,
                           CurrentUser currentUser, GeminiCategoryAdvisor gemini) {
        this.userService = userService;
        this.catalogService = catalogService;
        this.auditService = auditService;
        this.assignmentStrategies = assignmentStrategies;
        this.priorityStrategies = priorityStrategies;
        this.strategyService = strategyService;
        this.currentUser = currentUser;
        this.gemini = gemini;
    }

    /** Whether an outside service is switched on. The API key itself is never sent to the browser. */
    public record IntegrationStatus(String name, boolean enabled, String detail) {
    }

    @GetMapping("/integrations")
    @Operation(summary = "Which outside services are switched on (Gemini categorisation)")
    public List<IntegrationStatus> integrations() {
        return List.of(new IntegrationStatus(gemini.name(), gemini.isEnabled(), gemini.getModel()));
    }

    // Users

    @GetMapping("/users")
    public List<UserDto> users() {
        return userService.findAll().stream().map(UserDto::from).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an employee, technician or administrator")
    public UserDto createUser(@Valid @RequestBody CreateUserRequest request, Authentication auth) {
        return UserDto.from(userService.create(request, currentUser.from(auth)));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Change a user's name, e-mail, department (employee) or IT manager flag (admin)")
    public UserDto updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                              Authentication auth) {
        return UserDto.from(userService.update(id, request, currentUser.from(auth)));
    }

    @PutMapping("/users/{id}/password")
    @Operation(summary = "Set a new password for a user who forgot theirs")
    public UserDto resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordResetRequest request,
                                 Authentication auth) {
        return UserDto.from(userService.resetPassword(id, request.newPassword(), currentUser.from(auth)));
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
    public UserDto updateTechnician(@PathVariable Long id, @Valid @RequestBody UpdateTechnicianRequest request,
                                    Authentication auth) {
        return UserDto.from(userService.updateTechnician(id, request, currentUser.from(auth)));
    }

    // Services & categories

    @GetMapping("/services")
    public List<ServiceDto> services() {
        return catalogService.allServices().stream().map(ServiceDto::from).toList();
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto createService(@Valid @RequestBody ServiceRequest request, Authentication auth) {
        return ServiceDto.from(catalogService.createService(request, currentUser.from(auth)));
    }

    @PutMapping("/services/{id}")
    public ServiceDto updateService(@PathVariable Long id, @Valid @RequestBody ServiceRequest request,
                                    Authentication auth) {
        return ServiceDto.from(catalogService.updateService(id, request, currentUser.from(auth)));
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.allCategories().stream().map(CategoryDto::from).toList();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a category at runtime (no code change needed)")
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest request, Authentication auth) {
        return CategoryDto.from(catalogService.createCategory(request, currentUser.from(auth)));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Change a category's description, keywords or active flag (the name cannot change)")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request,
                                      Authentication auth) {
        return CategoryDto.from(catalogService.updateCategory(id, request, currentUser.from(auth)));
    }

    // SLA policies

    @GetMapping("/sla-policies")
    public List<SlaPolicyDto> slaPolicies() {
        return catalogService.slaPolicies().stream().map(SlaPolicyDto::from).toList();
    }

    @PutMapping("/sla-policies/{priority}")
    @Operation(summary = "Change response/resolution times for a priority")
    public SlaPolicyDto updateSlaPolicy(@PathVariable Priority priority,
                                        @Valid @RequestBody SlaPolicyRequest request, Authentication auth) {
        return SlaPolicyDto.from(catalogService.updateSlaPolicy(priority, request, currentUser.from(auth)));
    }

    @PostMapping("/sla-policies/services")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Give one service its own targets for a priority")
    public SlaPolicyDto createServiceSlaPolicy(@Valid @RequestBody ServiceSlaPolicyRequest request,
                                               Authentication auth) {
        return SlaPolicyDto.from(catalogService.createServiceSlaPolicy(request.serviceId(), request.priority(),
                request.targets(), currentUser.from(auth)));
    }

    @PutMapping("/sla-policies/services/{id}")
    public SlaPolicyDto updateServiceSlaPolicy(@PathVariable Long id, @Valid @RequestBody SlaPolicyRequest request,
                                               Authentication auth) {
        return SlaPolicyDto.from(catalogService.updateServiceSlaPolicy(id, request, currentUser.from(auth)));
    }

    @DeleteMapping("/sla-policies/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a service's own targets (the defaults apply again)")
    public void deleteServiceSlaPolicy(@PathVariable Long id, Authentication auth) {
        catalogService.deleteServiceSlaPolicy(id, currentUser.from(auth));
    }

    // Strategies

    @GetMapping("/strategies/assignment")
    public List<StrategyDto> assignmentStrategies() {
        return assignmentStrategies.getAll().stream()
                .map(s -> StrategyDto.from(s, assignmentStrategies.getActiveName())).toList();
    }

    @PutMapping("/strategies/assignment")
    @Operation(summary = "Switch assignment strategy at runtime: SKILL_BASED, LOAD_BASED, ROUND_ROBIN, SMART")
    public List<StrategyDto> selectAssignmentStrategy(@Valid @RequestBody StrategyRequest request,
                                                      Authentication auth) {
        strategyService.selectAssignment(request.name(), currentUser.from(auth));
        return assignmentStrategies();
    }

    @GetMapping("/strategies/priority")
    public List<StrategyDto> priorityStrategies() {
        return priorityStrategies.getAll().stream()
                .map(s -> StrategyDto.from(s, priorityStrategies.getActiveName())).toList();
    }

    @PutMapping("/strategies/priority")
    @Operation(summary = "Switch priority strategy at runtime: WEIGHTED, ITIL_MATRIX")
    public List<StrategyDto> selectPriorityStrategy(@Valid @RequestBody StrategyRequest request, Authentication auth) {
        strategyService.selectPriority(request.name(), currentUser.from(auth));
        return priorityStrategies();
    }

    // Audit

    @GetMapping("/audit")
    @Operation(summary = "Most recent audit records: incident events and administration changes (at most 500)")
    public List<AuditRecordDto> recentAudit(@RequestParam(defaultValue = "100") int limit) {
        return auditService.recent(limit).stream().map(AuditRecordDto::from).toList();
    }
}
