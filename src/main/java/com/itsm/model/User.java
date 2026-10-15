package com.itsm.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * ABSTRACTION + INHERITANCE.
 * Every person in the system is a User, but there is no such thing as a "plain" user:
 * you are always an Employee, a Technician or an Administrator (a real "is-a" relationship).
 * All three are stored in one table (SINGLE_TABLE) with a "user_type" column telling them apart.
 */
@Entity
@Table(name = "app_user")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "user_type")
public abstract class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /** Only the BCrypt hash is stored, never the real password. */
    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 120)
    private String email;

    private boolean active = true;

    private Instant createdAt = Instant.now();

    protected User() {
        // required by JPA
    }

    protected User(String username, String passwordHash, String fullName, String email) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.email = email;
    }

    /** Each subclass says which role it has - POLYMORPHISM. */
    public abstract Role getRole();

    /** Each role has its own rule for which incidents it may see - POLYMORPHISM. */
    public abstract boolean canView(Incident incident);

    public boolean isSameUser(User other) {
        return other != null && id != null && id.equals(other.getId());
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void changePasswordHash(String newHash) { this.passwordHash = newHash; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setEmail(String email) { this.email = email; }
    public void setActive(boolean active) { this.active = active; }

    @Override
    public String toString() {
        return getRole() + " " + username;
    }
}
