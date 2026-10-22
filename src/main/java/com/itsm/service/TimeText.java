package com.itsm.service;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Writes a time the way people read it in audit and notification messages, e.g. "09:21 on 22 Oct". */
final class TimeText {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("HH:mm 'on' d MMM", Locale.ENGLISH);

    private TimeText() {
    }

    static String of(Instant instant, Clock clock) {
        return FORMAT.withZone(clock.getZone()).format(instant);
    }
}
