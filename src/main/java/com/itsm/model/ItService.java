package com.itsm.model;

import com.itsm.exception.InvalidInputException;
import jakarta.persistence.*;

/** An IT service the organisation depends on (Payment Gateway, Email, VPN...). */
@Entity
@Table(name = "it_service")
public class ItService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    /** 1 (nice to have) .. 5 (business stops without it). Feeds the priority calculation. */
    private int businessCriticality;

    private boolean active = true;

    protected ItService() {
    }

    public ItService(String name, String description, int businessCriticality) {
        this.name = name;
        this.description = description;
        setBusinessCriticality(businessCriticality);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getBusinessCriticality() { return businessCriticality; }
    public boolean isActive() { return active; }

    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setActive(boolean active) { this.active = active; }

    /** Encapsulation: the value can only be changed through a method that checks it. */
    public void setBusinessCriticality(int businessCriticality) {
        if (businessCriticality < 1 || businessCriticality > 5) {
            throw new InvalidInputException("Business criticality must be between 1 and 5");
        }
        this.businessCriticality = businessCriticality;
    }
}
