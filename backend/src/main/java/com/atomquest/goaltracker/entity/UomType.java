package com.atomquest.goaltracker.entity;

public enum UomType {
    NUMERIC_MIN,       // Higher achievement is better (e.g. Sales Revenue)
    NUMERIC_MAX,       // Lower achievement is better (e.g. TAT, Cost)
    PERCENTAGE_MIN,
    PERCENTAGE_MAX,
    TIMELINE,          // Date-based completion
    ZERO_BASED         // Zero = 100% success (e.g. safety incidents)
}
