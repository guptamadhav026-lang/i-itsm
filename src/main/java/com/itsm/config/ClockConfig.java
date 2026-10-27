package com.itsm.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * One shared clock for the whole application. Code asks this bean for "now" instead of calling
 * Instant.now() directly, so tests can replace it with a fixed or fast-forwarded clock (e.g. to test SLA breaches),
 * and the demo data can be dated in the past (see {@link AppClock}).
 */
@Configuration
public class ClockConfig {

    /**
     * The time zone is used where the server writes a time into text (audit records, notifications) and as the
     * fallback for date filters. It is set explicitly because a Docker container or cloud server usually runs in UTC.
     */
    @Bean
    public AppClock clock(@Value("${itsm.time-zone:Asia/Kolkata}") String zone) {
        return new AppClock(Clock.system(ZoneId.of(zone)));
    }
}
