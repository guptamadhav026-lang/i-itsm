package com.itsm.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

/** A member of staff who reports incidents. */
@Entity
@DiscriminatorValue("EMPLOYEE")
public class Employee extends User {

    private String department;

    protected Employee() {
    }

    public Employee(String username, String passwordHash, String fullName, String email, String department) {
        super(username, passwordHash, fullName, email);
        this.department = department;
    }

    @Override
    public Role getRole() {
        return Role.EMPLOYEE;
    }

    /** Employees may only see the incidents they reported themselves. */
    @Override
    public boolean canView(Incident incident) {
        return isSameUser(incident.getReporter());
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
