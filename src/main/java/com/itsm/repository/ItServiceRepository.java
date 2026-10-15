package com.itsm.repository;

import com.itsm.model.ItService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItServiceRepository extends JpaRepository<ItService, Long> {

    boolean existsByNameIgnoreCase(String name);

    List<ItService> findByActiveTrueOrderByNameAsc();
}
