package com.itsm.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

/** An IT administrator / manager who configures the system and monitors everything. */
@Entity
@DiscriminatorValue("ADMIN")
public class Administrator extends User {

    /** IT managers receive the final level of escalation; other admins the level before it. */
    private boolean itManager;

    protected Administrator() {
    }

    public Administrator(String username, String passwordHash, String fullName, String email, boolean itManager) {
        super(username, passwordHash, fullName, email);
        this.itManager = itManager;
    }

    @Override
    public Role getRole() {
        return Role.ADMIN;
    }

    @Override
    public boolean canView(Incident incident) {
        return true;
    }

    public boolean isItManager() { return itManager; }
    public void setItManager(boolean itManager) { this.itManager = itManager; }
}
