package com.itsm.model;

/** Kinds of messages that can be attached to an incident. */
public enum NoteType {
    INVESTIGATION,   // technician's working notes
    INFO_REQUEST,    // technician asks the reporter for more details
    INFO_RESPONSE,   // reporter answers / adds information
    COMMENT
}
