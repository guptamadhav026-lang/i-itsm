package com.itsm.service;

import com.itsm.event.IncidentEventType;
import com.itsm.exception.DuplicateResourceException;
import com.itsm.exception.InvalidInputException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.model.Category;
import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;
import com.itsm.model.User;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.ItServiceRepository;
import com.itsm.repository.SlaPolicyRepository;
import com.itsm.web.dto.CategoryRequest;
import com.itsm.web.dto.ServiceRequest;
import com.itsm.web.dto.SlaPolicyRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/** Configuration that administrators manage: IT services, categories and SLA policies. */
@Service
@Transactional
public class CatalogService {

    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final SlaPolicyRepository slaPolicies;
    private final AdminAuditTrail audit;

    public CatalogService(ItServiceRepository services, CategoryRepository categories,
                          SlaPolicyRepository slaPolicies, AdminAuditTrail audit) {
        this.services = services;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
        this.audit = audit;
    }

    // IT services

    @Transactional(readOnly = true)
    public List<ItService> activeServices() {
        return services.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<ItService> allServices() {
        return services.findAll();
    }

    @Transactional(readOnly = true)
    public ItService getService(Long id) {
        return services.findById(id).orElseThrow(() -> new ResourceNotFoundException("IT service " + id + " not found"));
    }

    public ItService createService(ServiceRequest request, User admin) {
        if (services.existsByNameIgnoreCase(request.name().trim())) {
            throw new DuplicateResourceException("A service called '" + request.name() + "' already exists");
        }
        ItService service = services.save(new ItService(request.name().trim(), request.description(),
                request.businessCriticality()));
        audit.record(admin, IncidentEventType.SERVICE_CHANGED, "Added service " + service.getName()
                + " (criticality " + service.getBusinessCriticality() + ")");
        return service;
    }

    public ItService updateService(Long id, ServiceRequest request, User admin) {
        ItService service = services.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IT service " + id + " not found"));
        String newName = request.name().trim();
        if (!newName.equalsIgnoreCase(service.getName()) && services.existsByNameIgnoreCase(newName)) {
            throw new DuplicateResourceException("A service called '" + newName + "' already exists");
        }
        String oldName = service.getName();
        service.setName(newName);
        service.setDescription(request.description());
        service.setBusinessCriticality(request.businessCriticality());
        if (request.active() != null) {
            service.setActive(request.active());
        }
        audit.record(admin, IncidentEventType.SERVICE_CHANGED, "Updated service " + oldName
                + (oldName.equals(newName) ? "" : " (now " + newName + ")") + ": criticality "
                + service.getBusinessCriticality() + (service.isActive() ? ", active" : ", inactive"));
        return service;
    }

    // Categories

    @Transactional(readOnly = true)
    public List<Category> activeCategories() {
        return categories.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> allCategories() {
        return categories.findAll();
    }

    /** New categories need no code change: the rest of the system reads them from the database. */
    public Category createCategory(CategoryRequest request, User admin) {
        if (categories.findByNameIgnoreCase(request.name().trim()).isPresent()) {
            throw new DuplicateResourceException("Category '" + request.name() + "' already exists");
        }
        Category category = categories.save(new Category(request.name(), request.description(), request.keywords()));
        audit.record(admin, IncidentEventType.CATEGORY_CHANGED, "Added category " + category.getName());
        return category;
    }

    /** Description, keywords and active flag. The name is fixed, because technician skills are category names. */
    public Category updateCategory(Long id, CategoryRequest request, User admin) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category " + id + " not found"));
        if (!request.name().trim().equalsIgnoreCase(category.getName())) {
            throw new InvalidInputException("A category cannot be renamed, because technicians' skills and past "
                    + "incidents use its name. Add a new category instead.");
        }
        category.setDescription(request.description());
        category.setKeywords(request.keywords());
        if (request.active() != null) {
            category.setActive(request.active());
        }
        audit.record(admin, IncidentEventType.CATEGORY_CHANGED, "Updated category " + category.getName()
                + (category.isActive() ? "" : " (inactive)"));
        return category;
    }

    // SLA policies

    /** Defaults first (P1 to P4), then the service-specific ones grouped by service. */
    @Transactional(readOnly = true)
    public List<SlaPolicy> slaPolicies() {
        return slaPolicies.findAll().stream()
                .sorted(Comparator.comparing((SlaPolicy p) -> p.isDefault() ? "" : p.getService().getName())
                        .thenComparing(SlaPolicy::getPriority))
                .toList();
    }

    /** Changes the default targets of a priority (creates them if they were missing). */
    public SlaPolicy updateSlaPolicy(Priority priority, SlaPolicyRequest request, User admin) {
        SlaPolicy policy = slaPolicies.findByPriorityAndServiceIsNull(priority).orElse(null);
        if (policy == null) {
            policy = slaPolicies.save(new SlaPolicy(priority, request.responseMinutes(), request.resolutionMinutes(),
                    request.warningThresholdPercent()));
        } else {
            policy.update(request.responseMinutes(), request.resolutionMinutes(), request.warningThresholdPercent());
        }
        recordSla(admin, "Default " + priority, request);
        return policy;
    }

    /** Gives one service its own targets for one priority, instead of the default ones. */
    public SlaPolicy createServiceSlaPolicy(Long serviceId, Priority priority, SlaPolicyRequest request, User admin) {
        ItService service = services.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("IT service " + serviceId + " not found"));
        if (slaPolicies.findByPriorityAndService(priority, service).isPresent()) {
            throw new DuplicateResourceException(service.getName() + " already has its own " + priority + " targets");
        }
        SlaPolicy policy = slaPolicies.save(new SlaPolicy(priority, service, request.responseMinutes(),
                request.resolutionMinutes(), request.warningThresholdPercent()));
        recordSla(admin, service.getName() + " " + priority + " (new)", request);
        return policy;
    }

    public SlaPolicy updateServiceSlaPolicy(Long id, SlaPolicyRequest request, User admin) {
        SlaPolicy policy = serviceSlaPolicy(id);
        policy.update(request.responseMinutes(), request.resolutionMinutes(), request.warningThresholdPercent());
        recordSla(admin, policy.getService().getName() + " " + policy.getPriority(), request);
        return policy;
    }

    /** Removes a service's own targets, so the defaults apply to it again. */
    public void deleteServiceSlaPolicy(Long id, User admin) {
        SlaPolicy policy = serviceSlaPolicy(id);
        slaPolicies.delete(policy);
        audit.record(admin, IncidentEventType.SLA_POLICY_CHANGED, policy.getService().getName() + " "
                + policy.getPriority() + ": own targets removed, the defaults apply again");
    }

    private void recordSla(User admin, String which, SlaPolicyRequest request) {
        audit.record(admin, IncidentEventType.SLA_POLICY_CHANGED, which + " targets: respond in "
                + request.responseMinutes() + " min, resolve in " + request.resolutionMinutes() + " min, warn at "
                + request.warningThresholdPercent() + "%");
    }

    private SlaPolicy serviceSlaPolicy(Long id) {
        SlaPolicy policy = slaPolicies.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SLA policy " + id + " not found"));
        if (policy.isDefault()) {
            throw new InvalidInputException("The default targets can be changed but not removed");
        }
        return policy;
    }
}
