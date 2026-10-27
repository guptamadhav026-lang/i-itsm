package com.itsm.service;

import com.itsm.event.IncidentEventType;
import com.itsm.exception.DuplicateResourceException;
import com.itsm.exception.InvalidInputException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.live.LiveUpdateHub;
import com.itsm.model.Administrator;
import com.itsm.model.Category;
import com.itsm.model.Employee;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Role;
import com.itsm.model.Technician;
import com.itsm.model.User;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.TechnicianRepository;
import com.itsm.repository.UserRepository;
import com.itsm.web.dto.CreateUserRequest;
import com.itsm.web.dto.RegisterRequest;
import com.itsm.web.dto.UpdateTechnicianRequest;
import com.itsm.web.dto.UpdateUserRequest;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Creating, finding and managing users of all three roles. */
@Service
@Transactional
public class UserService {

    /** BCrypt only looks at the first 72 bytes of a password, so longer ones are refused instead of cut. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final UserRepository users;
    private final TechnicianRepository technicians;
    private final CategoryRepository categories;
    private final IncidentRepository incidents;
    private final UserFactory userFactory;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditTrail audit;
    private final LiveUpdateHub liveUpdates;

    public UserService(UserRepository users, TechnicianRepository technicians, CategoryRepository categories,
                       IncidentRepository incidents, UserFactory userFactory, PasswordEncoder passwordEncoder,
                       AdminAuditTrail audit, LiveUpdateHub liveUpdates) {
        this.users = users;
        this.technicians = technicians;
        this.categories = categories;
        this.incidents = incidents;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.liveUpdates = liveUpdates;
    }

    /** Anyone can register, but only as an Employee. */
    public User register(RegisterRequest request) {
        return create(new CreateUserRequest(Role.EMPLOYEE, request.username(), request.password(),
                request.fullName(), request.email(), request.department(), null, null, null, null, null));
    }

    /** Administrators can create any role. */
    public User create(CreateUserRequest request, User admin) {
        User user = create(request);
        audit.record(admin, IncidentEventType.USER_CREATED, "Created " + user.getRole().name().toLowerCase(Locale.ROOT)
                + " " + user.getUsername() + " (" + user.getFullName() + ")");
        return user;
    }

    /** Without an audit record: used for self-registration and by the demo data loader. */
    public User create(CreateUserRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(username)) {
            throw new DuplicateResourceException("Username '" + username + "' is already taken");
        }
        requirePasswordFits(request.password());
        Set<String> skills = request.role() == Role.TECHNICIAN ? knownSkills(request.skills()) : null;
        CreateUserRequest normalised = new CreateUserRequest(request.role(), username, request.password(),
                request.fullName().trim(), request.email().trim(), request.department(), skills,
                request.experienceYears(), request.maxActiveIncidents(), request.teamLead(), request.itManager());
        return users.save(userFactory.create(normalised, passwordEncoder.encode(request.password())));
    }

    /** At start-up: tokens of accounts deactivated earlier must not open live-update streams either. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional(readOnly = true)
    public void blockDeactivatedAccounts() {
        users.findByActiveFalse().forEach(u -> liveUpdates.block(u.getUsername()));
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

    /**
     * A technician who still holds open incidents cannot be deactivated: those incidents would be stuck with an
     * account nobody uses. A deactivated user's open live-update connections are closed straight away.
     */
    public User setActive(Long id, boolean active, User admin) {
        User user = getById(id);
        if (user.isSameUser(admin) && !active) {
            throw new InvalidInputException("You cannot deactivate your own account");
        }
        if (user.isActive() == active) {
            return user;
        }
        if (!active && user instanceof Technician technician) {
            List<String> open = incidents.findByAssignedTechnicianOrderByCreatedAtDesc(technician).stream()
                    .filter(i -> IncidentStatus.ACTIVE_WORK.contains(i.getStatus()))
                    .map(Incident::getReference).toList();
            if (!open.isEmpty()) {
                throw new InvalidInputException(technician.getFullName() + " still has " + open.size()
                        + " open incident" + (open.size() == 1 ? "" : "s") + " (" + String.join(", ", open)
                        + "). Reassign " + (open.size() == 1 ? "it" : "them") + " first.");
            }
        }
        user.setActive(active);
        if (active) {
            liveUpdates.unblock(user.getUsername());
        } else {
            liveUpdates.block(user.getUsername());
        }
        audit.record(admin, active ? IncidentEventType.USER_ACTIVATED : IncidentEventType.USER_DEACTIVATED,
                (active ? "Activated " : "Deactivated ") + user.getUsername() + " (" + user.getFullName() + ")");
        return user;
    }

    /** Name and e-mail for everyone; department for employees; IT manager flag for administrators. */
    public User update(Long id, UpdateUserRequest request, User admin) {
        User user = getById(id);
        List<String> changes = new ArrayList<>();
        if (request.fullName() != null && !request.fullName().trim().equals(user.getFullName())) {
            user.setFullName(request.fullName().trim());
            changes.add("name");
        }
        if (request.email() != null && !request.email().trim().equals(user.getEmail())) {
            user.setEmail(request.email().trim());
            changes.add("e-mail");
        }
        if (request.department() != null && user instanceof Employee employee
                && !request.department().trim().equals(employee.getDepartment())) {
            employee.setDepartment(request.department().trim());
            changes.add("department");
        }
        if (request.itManager() != null && user instanceof Administrator administrator
                && request.itManager() != administrator.isItManager()) {
            administrator.setItManager(request.itManager());
            changes.add(request.itManager() ? "now IT manager" : "no longer IT manager");
        }
        if (!changes.isEmpty()) {
            audit.record(admin, IncidentEventType.USER_UPDATED,
                    "Updated " + user.getUsername() + ": " + String.join(", ", changes));
        }
        return user;
    }

    /** For someone who forgot their password: the administrator sets a new one and tells them. */
    public User resetPassword(Long id, String newPassword, User admin) {
        User user = getById(id);
        requirePasswordFits(newPassword);
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        audit.record(admin, IncidentEventType.PASSWORD_RESET, "Set a new password for " + user.getUsername());
        return user;
    }

    public void changeOwnPassword(User user, String currentPassword, String newPassword) {
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            // 400, not 401: a wrong guess here must not log the user out of the website
            throw new InvalidInputException("Your current password is not correct");
        }
        requirePasswordFits(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new InvalidInputException("The new password must be different from the current one");
        }
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        audit.record(user, IncidentEventType.PASSWORD_CHANGED, user.getUsername() + " changed their password");
    }

    public Technician updateTechnician(Long id, UpdateTechnicianRequest request, User admin) {
        Technician technician = getTechnician(id);
        List<String> changes = new ArrayList<>();
        if (request.skills() != null) {
            Set<String> skills = knownSkills(request.skills());
            if (!skills.equals(technician.getSkills())) {
                technician.setSkills(skills);
                changes.add("skills " + (skills.isEmpty() ? "none" : String.join(", ", skills)));
            }
        }
        if (request.experienceYears() != null && request.experienceYears() != technician.getExperienceYears()) {
            technician.setExperienceYears(request.experienceYears());
            changes.add(request.experienceYears() + " years of experience");
        }
        if (request.maxActiveIncidents() != null && request.maxActiveIncidents() != technician.getMaxActiveIncidents()) {
            technician.setMaxActiveIncidents(request.maxActiveIncidents());
            changes.add("limit " + request.maxActiveIncidents() + " active incidents");
        }
        if (request.available() != null && request.available() != technician.isAvailable()) {
            technician.setAvailable(request.available());
            changes.add(request.available() ? "available" : "away");
        }
        if (request.teamLead() != null && request.teamLead() != technician.isTeamLead()) {
            technician.setTeamLead(request.teamLead());
            changes.add(request.teamLead() ? "team lead" : "not team lead");
        }
        if (!changes.isEmpty()) {
            audit.record(admin, IncidentEventType.USER_UPDATED,
                    "Updated technician " + technician.getUsername() + ": " + String.join(", ", changes));
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

    private static void requirePasswordFits(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new InvalidInputException("The password is too long (at most " + MAX_PASSWORD_BYTES + " bytes)");
        }
    }

    /** A skill is the name of a category (that is what SKILL_BASED and SMART compare), so unknown names are refused. */
    private Set<String> knownSkills(Set<String> requested) {
        Set<String> skills = new LinkedHashSet<>();
        if (requested == null) {
            return skills;
        }
        for (String name : requested) {
            Category category = categories.findByNameIgnoreCase(name.trim())
                    .orElseThrow(() -> new InvalidInputException("There is no category called '" + name.trim()
                            + "', so it cannot be a skill"));
            skills.add(category.getName());
        }
        return skills;
    }
}
