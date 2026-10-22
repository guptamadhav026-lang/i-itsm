package com.itsm.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

/**
 * The application's clock. It shows the real time, except while the demo data is being loaded: the seeder
 * sets it to moments in the past, so the demo history (finished incidents with real response and fix times)
 * looks like it happened over the last few days. Nothing else sets it.
 */
public class AppClock extends Clock {

    private final Clock real;
    private volatile Instant setTo;   // null = real time

    public AppClock(Clock real) {
        this.real = real;
    }

    /** The real time, even while the clock is set to another moment. */
    public Instant realNow() {
        return real.instant();
    }

    public void setTo(Instant moment) {
        setTo = moment;
    }

    public void backToRealTime() {
        setTo = null;
    }

    @Override
    public Instant instant() {
        Instant moment = setTo;
        return moment != null ? moment : real.instant();
    }

    @Override
    public ZoneId getZone() {
        return real.getZone();
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return new AppClock(real.withZone(zone));
    }
}
