package com.itsm.model;

import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** A support engineer who investigates and resolves incidents. */
@Entity
@DiscriminatorValue("TECHNICIAN")
public class Technician extends User {

    /** Category names this technician is skilled in, e.g. NETWORK, DATABASE. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "technician_skill", joinColumns = @JoinColumn(name = "technician_id"))
    @Column(name = "skill")
    private Set<String> skills = new HashSet<>();

    private int experienceYears;

    /** Workload limit: assignment fails with WorkloadExceededException beyond this. */
    private int maxActiveIncidents = 5;

    private boolean available = true;

    /** Team leads receive the first level of escalations. */
    private boolean teamLead;

    protected Technician() {
    }

    public Technician(String username, String passwordHash, String fullName, String email,
                      Set<String> skills, int experienceYears, int maxActiveIncidents, boolean teamLead) {
        super(username, passwordHash, fullName, email);
        setSkills(skills);
        this.experienceYears = experienceYears;
        this.maxActiveIncidents = maxActiveIncidents;
        this.teamLead = teamLead;
    }

    @Override
    public Role getRole() {
        return Role.TECHNICIAN;
    }

    /** Technicians can see every incident, so they can help colleagues and spot related problems. */
    @Override
    public boolean canView(Incident incident) {
        return true;
    }

    public boolean hasSkill(String categoryName) {
        return categoryName != null && skills.contains(categoryName.toUpperCase(Locale.ROOT));
    }

    public boolean isAssignedTo(Incident incident) {
        return isSameUser(incident.getAssignedTechnician());
    }

    /** Returns a copy so callers cannot change the skills without going through setSkills (encapsulation). */
    public Set<String> getSkills() { return Set.copyOf(skills); }

    public void setSkills(Set<String> newSkills) {
        skills.clear();
        if (newSkills != null) {
            newSkills.forEach(s -> skills.add(s.trim().toUpperCase(Locale.ROOT)));
        }
    }

    public int getExperienceYears() { return experienceYears; }
    public void setExperienceYears(int experienceYears) { this.experienceYears = experienceYears; }
    public int getMaxActiveIncidents() { return maxActiveIncidents; }
    public void setMaxActiveIncidents(int maxActiveIncidents) { this.maxActiveIncidents = maxActiveIncidents; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public boolean isTeamLead() { return teamLead; }
    public void setTeamLead(boolean teamLead) { this.teamLead = teamLead; }
}
