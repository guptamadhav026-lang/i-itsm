package com.itsm.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One saved setting, e.g. which assignment strategy is active, so the choice survives a restart. */
@Entity
@Table(name = "app_setting")
public class AppSetting {

    @Id
    @Column(length = 50)
    private String name;

    @Column(name = "setting_value", nullable = false, length = 100)   // "value" is a reserved word in H2
    private String value;

    protected AppSetting() {
    }

    public AppSetting(String name, String value) {
        this.name = name;
        this.value = value;
    }

    public String getName() { return name; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
