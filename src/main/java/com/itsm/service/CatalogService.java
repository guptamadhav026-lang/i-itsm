package com.itsm.service;

import com.itsm.exception.DuplicateResourceException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.model.Category;
import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;
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

    public CatalogService(ItServiceRepository services, CategoryRepository categories,
                          SlaPolicyRepository slaPolicies) {
        this.services = services;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
    }

    // ---------------------------------------------------------------- IT services

    @Transactional(readOnly = true)
    public List<ItService> activeServices() {
        return services.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<ItService> allServices() {
        return services.findAll();
    }

    public ItService createService(ServiceRequest request) {
        if (services.existsByNameIgnoreCase(request.name().trim())) {
            throw new DuplicateResourceException("A service called '" + request.name() + "' already exists");
        }
        return services.save(new ItService(request.name().trim(), request.description(), request.businessCriticality()));
    }

    public ItService updateService(Long id, ServiceRequest request) {
        ItService service = services.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IT service " + id + " not found"));
        service.setName(request.name().trim());
        service.setDescription(request.description());
        service.setBusinessCriticality(request.businessCriticality());
        if (request.active() != null) {
            service.setActive(request.active());
        }
        return service;
    }

    // ---------------------------------------------------------------- categories

    @Transactional(readOnly = true)
    public List<Category> activeCategories() {
        return categories.findByActiveTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> allCategories() {
        return categories.findAll();
    }

    /** New categories need no code change: the rest of the system reads them from the database. */
    public Category createCategory(CategoryRequest request) {
        if (categories.findByNameIgnoreCase(request.name().trim()).isPresent()) {
            throw new DuplicateResourceException("Category '" + request.name() + "' already exists");
        }
        return categories.save(new Category(request.name(), request.description(), request.keywords()));
    }

    public Category updateCategory(Long id, CategoryRequest request) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category " + id + " not found"));
        category.setDescription(request.description());
        category.setKeywords(request.keywords());
        if (request.active() != null) {
            category.setActive(request.active());
        }
        return category;
    }

    // ---------------------------------------------------------------- SLA policies

    @Transactional(readOnly = true)
    public List<SlaPolicy> slaPolicies() {
        return slaPolicies.findAll().stream().sorted(Comparator.comparing(SlaPolicy::getPriority)).toList();
    }

    public SlaPolicy updateSlaPolicy(Priority priority, SlaPolicyRequest request) {
        SlaPolicy policy = slaPolicies.findByPriority(priority).orElse(null);
        if (policy == null) {
            return slaPolicies.save(new SlaPolicy(priority, request.responseMinutes(), request.resolutionMinutes(),
                    request.warningThresholdPercent()));
        }
        policy.update(request.responseMinutes(), request.resolutionMinutes(), request.warningThresholdPercent());
        return policy;
    }
}
