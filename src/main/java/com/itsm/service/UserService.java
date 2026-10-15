package com.itsm.service;

import com.itsm.exception.DuplicateResourceException;
import com.itsm.exception.InvalidInputException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.model.Role;
import com.itsm.model.Technician;
import com.itsm.model.User;
import com.itsm.repository.TechnicianRepository;
import com.itsm.repository.UserRepository;
import com.itsm.web.dto.CreateUserRequest;
import com.itsm.web.dto.RegisterRequest;
import com.itsm.web.dto.UpdateTechnicianRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** Creating, finding and managing users of all three roles. */
@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final TechnicianRepository technicians;
    private final UserFactory userFactory;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository users, TechnicianRepository technicians, UserFactory userFactory,
                       PasswordEncoder passwordEncoder) {
        this.users = users;
        this.technicians = technicians;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
    }

    /** Anyone can register, but only as an Employee. */
    public User register(RegisterRequest request) {
        return create(new CreateUserRequest(Role.EMPLOYEE, request.username(), request.password(),
                request.fullName(), request.email(), request.department(), null, null, null, null, null));
    }

    /** Administrators can create any role. */
    public User create(CreateUserRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(username)) {
            throw new DuplicateResourceException("Username '" + username + "' is already taken");
        }
        CreateUserRequest normalised = new CreateUserRequest(request.role(), username, request.password(),
                request.fullName().trim(), request.email().trim(), request.department(), request.skills(),
                request.experienceYears(), request.maxActiveIncidents(), request.teamLead(), request.itManager());
        return users.save(userFactory.create(normalised, passwordEncoder.encode(request.password())));
    }

    @Transactional(readOnly = true)
    public User getByUsername(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User '" + username + "' not found"));
    }

    @Transactional(readOnly = true)
    public User getById(Long id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return users.findAll();
    }

    @Transactional(readOnly = true)
    public List<Technician> findTechnicians() {
        return technicians.findAll();
    }

    public User setActive(Long id, boolean active, User admin) {
        User user = getById(id);
        if (user.isSameUser(admin) && !active) {
            throw new InvalidInputException("You cannot deactivate your own account");
        }
        user.setActive(active);
        return user;
    }

    public Technician updateTechnician(Long id, UpdateTechnicianRequest request) {
        Technician technician = getTechnician(id);
        if (request.skills() != null) {
            technician.setSkills(request.skills());
        }
        if (request.experienceYears() != null) {
            technician.setExperienceYears(request.experienceYears());
        }
        if (request.maxActiveIncidents() != null) {
            technician.setMaxActiveIncidents(request.maxActiveIncidents());
        }
        if (request.available() != null) {
            technician.setAvailable(request.available());
        }
        if (request.teamLead() != null) {
            technician.setTeamLead(request.teamLead());
        }
        return technician;
    }

    public Technician setAvailability(User currentUser, boolean available) {
        Technician technician = getTechnician(currentUser.getId());
        technician.setAvailable(available);
        return technician;
    }

    @Transactional(readOnly = true)
    public Technician getTechnician(Long id) {
        return technicians.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician " + id + " not found"));
    }
}
