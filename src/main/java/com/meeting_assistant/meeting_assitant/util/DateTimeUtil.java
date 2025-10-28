package com.meeting_assistant.meeting_assitant.util;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class DateTimeUtil {

    private DateTimeUtil() {
    }

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    public static OffsetDateTime toUtc(OffsetDateTime dt) {
        if (dt == null)
            return null;
        return dt.withOffsetSameInstant(OffsetDateTime.now(ZoneId.of("UTC")).getOffset());
    }

    public static OffsetDateTime nowUtc() {
        return OffsetDateTime.now(ZoneId.of("UTC"));
    }

    public static String formatIso(OffsetDateTime dt) {
        if (dt == null)
            return null;
        return ISO_FORMATTER.format(dt);
    }

    public static OffsetDateTime parseIso(String s) {
        if (s == null || s.isBlank())
            return null;
        return OffsetDateTime.parse(s, ISO_FORMATTER);
    }

    public static OffsetDateTime fromEpochMilli(long epochMilli) {
        return OffsetDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZoneId.of("UTC"));
    }

    /**
     * Converts OffsetDateTime to UTC ISO string format for Google Calendar API
     */
    public static String toUtcString(OffsetDateTime dt) {
        if (dt == null)
            return null;
        return formatIso(toUtc(dt));
    }

}
