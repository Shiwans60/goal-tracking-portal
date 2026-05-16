package com.atomquest.goaltracker;

import com.atomquest.goaltracker.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the core weightage rules from the BRD:
 *  1. Total must equal 100%
 *  2. Each goal minimum 10%
 *  3. Maximum 8 goals per cycle
 */
class WeightageValidationTest {

    // Extracted as pure logic — no Spring context needed
    static void validateWeightage(List<BigDecimal> weights) {
        if (weights.size() > 8) {
            throw new BusinessException("Maximum 8 goals allowed per cycle.");
        }
        for (BigDecimal w : weights) {
            if (w.compareTo(BigDecimal.TEN) < 0) {
                throw new BusinessException("Each goal must have at least 10% weightage.");
            }
        }
        BigDecimal total = weights.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(new BigDecimal("100")) != 0) {
            throw new BusinessException("Total weightage must equal 100%. Current: " + total + "%");
        }
    }

    @Test
    @DisplayName("Valid set of 3 goals totalling 100% passes")
    void validWeightage_passes() {
        assertDoesNotThrow(() -> validateWeightage(List.of(
                new BigDecimal("40"),
                new BigDecimal("35"),
                new BigDecimal("25")
        )));
    }

    @Test
    @DisplayName("Total below 100% throws BusinessException")
    void totalBelow100_throws() {
        var ex = assertThrows(BusinessException.class, () -> validateWeightage(List.of(
                new BigDecimal("40"), new BigDecimal("30")
        )));
        assertTrue(ex.getMessage().contains("100%"));
    }

    @Test
    @DisplayName("Total above 100% throws BusinessException")
    void totalAbove100_throws() {
        assertThrows(BusinessException.class, () -> validateWeightage(List.of(
                new BigDecimal("60"), new BigDecimal("50")
        )));
    }

    @Test
    @DisplayName("Goal with weightage below 10% throws BusinessException")
    void belowMinimumWeightage_throws() {
        var ex = assertThrows(BusinessException.class, () -> validateWeightage(List.of(
                new BigDecimal("5"),
                new BigDecimal("95")
        )));
        assertTrue(ex.getMessage().contains("10%"));
    }

    @Test
    @DisplayName("More than 8 goals throws BusinessException")
    void moreThan8Goals_throws() {
        var weights = List.of(
                bd("12"), bd("12"), bd("12"), bd("12"),
                bd("12"), bd("12"), bd("12"), bd("12"), bd("4")
        );
        var ex = assertThrows(BusinessException.class, () -> validateWeightage(weights));
        assertTrue(ex.getMessage().contains("8 goals"));
    }

    @Test
    @DisplayName("Exactly 8 goals totalling 100% passes")
    void exactly8Goals_passes() {
        var weights = List.of(
                bd("15"), bd("15"), bd("15"), bd("10"),
                bd("10"), bd("10"), bd("15"), bd("10")
        );
        assertDoesNotThrow(() -> validateWeightage(weights));
    }

    @ParameterizedTest(name = "Individual weight {0}% with complement {1}% should pass")
    @CsvSource({ "10,90", "50,50", "90,10", "25,75", "33,67" })
    void boundaryWeightages_pass(String w1, String w2) {
        assertDoesNotThrow(() -> validateWeightage(List.of(bd(w1), bd(w2))));
    }

    private static BigDecimal bd(String val) { return new BigDecimal(val); }
}
