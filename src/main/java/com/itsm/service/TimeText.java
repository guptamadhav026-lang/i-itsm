package com.itsm.service;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Writes a time the way people read it in audit and notification messages, e.g. "09:21 IST on 22 Oct".
 * The zone is part of the text because the text is saved once but may be read from anywhere.
 */
final class TimeText {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("HH:mm z 'on' d MMM", Locale.ENGLISH);

    private TimeText() {
    }

    static String of(Instant instant, Clock clock) {
        return FORMAT.withZone(clock.getZone()).format(instant);
    }
}
