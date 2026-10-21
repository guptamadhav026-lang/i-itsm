package com.itsm.model;

/** Kinds of messages that can be attached to an incident. */
public enum NoteType {
    INVESTIGATION("Investigation note"),   // technician's working notes
    INFO_REQUEST("Question"),              // technician asks the reporter for more details
    INFO_RESPONSE("Answer"),               // reporter answers / adds information
    COMMENT("Comment");

    private final String label;

    NoteType(String label) {
        this.label = label;
    }

    /** Readable name used in notifications and the history, e.g. "Question". */
    public String label() {
        return label;
    }
}
