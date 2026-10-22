package com.itsm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * One shared clock for the whole application. Code asks this bean for "now" instead of calling
 * Instant.now() directly, so tests can replace it with a fixed or fast-forwarded clock (e.g. to test SLA breaches),
 * and the demo data can be dated in the past (see {@link AppClock}).
 */
@Configuration
public class ClockConfig {

    @Bean
    public AppClock clock() {
        return new AppClock(Clock.systemDefaultZone());
    }
}
