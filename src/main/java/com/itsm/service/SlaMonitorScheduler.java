package com.itsm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Runs the SLA checks in the background. Switch off with itsm.sla.monitor-enabled=false. */
@Component
@ConditionalOnProperty(name = "itsm.sla.monitor-enabled", havingValue = "true", matchIfMissing = true)
public class SlaMonitorScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaMonitorScheduler.class);

    private final SlaMonitorService monitor;

    public SlaMonitorScheduler(SlaMonitorService monitor) {
        this.monitor = monitor;
    }

    @Scheduled(fixedDelayString = "${itsm.sla.monitor-interval-ms:60000}", initialDelay = 10_000)
    public void run() {
        try {
            int changed = monitor.runChecks();
            if (changed > 0) {
                log.info("SLA monitor updated {} incident(s)", changed);
            }
        } catch (RuntimeException ex) {
            log.error("SLA monitor run failed", ex);
        }
    }
}
