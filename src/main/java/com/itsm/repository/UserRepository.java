package com.itsm.repository;

import com.itsm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * REPOSITORY PATTERN: the rest of the code asks for users through this interface
 * and never writes SQL. Spring Data generates the implementation from the method names.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}
