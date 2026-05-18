package com.atomquest.goaltracker.service;

import com.atomquest.goaltracker.entity.*;
import com.atomquest.goaltracker.exception.BusinessException;
import com.atomquest.goaltracker.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 9 — Report Service.
 *
 * Generates Excel workbooks using Apache POI for:
 *  1. Achievement report (goal details + quarterly achievements)
 *  2. Completion dashboard (per-employee check-in completion rates)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final GoalRepository    goalRepository;
    private final CheckinRepository checkinRepository;
    private final CycleRepository   cycleRepository;
    private final UserRepository    userRepository;

    // ── Filter ────────────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class ReportFilter {
        private UUID   cycleId;
        private String quarter;
        private UUID   employeeId;
        private UUID   managerId;
        private String department;
        private String requesterId;
        private String requesterRole;
    }

    // ── Achievement Report Row ────────────────────────────────────────────────

    @Data
    @Builder
    public static class AchievementRow {
        private String     employeeName;
        private String     employeeEmail;
        private String     managerName;
        private String     department;
        private String     cycleName;
        private String     quarter;
        private String     thrustArea;
        private String     goalTitle;
        private String     uomType;
        private BigDecimal target;
        private BigDecimal achievement;
        private LocalDate  completionDate;
        private String     progressStatus;
        private BigDecimal progressScore;
        private BigDecimal weightage;
        private String     goalStatus;
    }

    // ── Completion Row ────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class CompletionRow {
        private String     employeeName;
        private String     employeeEmail;
        private String     department;
        private String     managerName;
        private int        approvedGoals;
        private int        checkedInQ1;
        private int        checkedInQ2;
        private int        checkedInQ3;
        private int        checkedInQ4;
        private BigDecimal q1Pct;
        private BigDecimal q2Pct;
        private BigDecimal q3Pct;
        private BigDecimal q4Pct;
        private BigDecimal overallProgressScore;
    }

    // ── Achievement Report ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AchievementRow> getAchievementReportRows(ReportFilter filter) {
        UUID cycleId = resolveCycleId(filter.getCycleId());
        List<Goal> goals = getGoalsForFilter(filter, cycleId);

        List<AchievementRow> rows = new ArrayList<>();

        for (Goal goal : goals) {
            if (goal.getStatus() != GoalStatus.APPROVED) continue;

            List<Checkin> checkins = checkinRepository.findByGoalId(goal.getId());

            // Filter by quarter if specified
            if (filter.getQuarter() != null) {
                Quarter q = Quarter.valueOf(filter.getQuarter().toUpperCase());
                checkins = checkins.stream()
                        .filter(c -> c.getQuarter() == q)
                        .collect(Collectors.toList());
            }

            if (checkins.isEmpty()) {
                // Goal with no check-ins — still include in report
                rows.add(buildAchievementRow(goal, null));
            } else {
                for (Checkin checkin : checkins) {
                    rows.add(buildAchievementRow(goal, checkin));
                }
            }
        }

        // Sort by employee name, then thrust area
        rows.sort(Comparator.comparing(AchievementRow::getEmployeeName)
                .thenComparing(AchievementRow::getThrustArea));
        return rows;
    }

    @Transactional(readOnly = true)
    public byte[] generateAchievementReport(ReportFilter filter) throws IOException {
        List<AchievementRow> rows = getAchievementReportRows(filter);
        UUID cycleId = resolveCycleId(filter.getCycleId());
        String cycleName = cycleRepository.findById(cycleId)
                .map(Cycle::getName).orElse("Unknown Cycle");

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFSheet sheet = wb.createSheet("Achievement Report");
            sheet.setDefaultColumnWidth(20);

            // ── Styles ────────────────────────────────────────────────────────
            XSSFCellStyle titleStyle = createTitleStyle(wb);
            XSSFCellStyle headerStyle = createHeaderStyle(wb);
            XSSFCellStyle dataStyle = createDataStyle(wb);
            XSSFCellStyle numberStyle = createNumberStyle(wb);
            XSSFCellStyle pctStyle = createPctStyle(wb);
            XSSFCellStyle greenStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)198, (byte)239, (byte)206}, null));
            XSSFCellStyle orangeStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)255, (byte)235, (byte)156}, null));
            XSSFCellStyle redStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)255, (byte)199, (byte)206}, null));

            int rowNum = 0;

            // Title row
            Row titleRow = sheet.createRow(rowNum++);
            titleRow.setHeight((short) 600);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("AtomQuest — Achievement Report: " + cycleName);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 13));

            // Generated date row
            Row dateRow = sheet.createRow(rowNum++);
            dateRow.createCell(0).setCellValue(
                    "Generated: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
            rowNum++; // blank row

            // ── Header row ────────────────────────────────────────────────────
            Row headerRow = sheet.createRow(rowNum++);
            headerRow.setHeight((short) 500);
            String[] headers = {
                    "Employee Name", "Email", "Manager", "Department",
                    "Cycle", "Quarter", "Thrust Area", "Goal Title",
                    "UoM", "Target", "Achievement", "Progress Status",
                    "Score (%)", "Weightage (%)"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // ── Data rows ─────────────────────────────────────────────────────
            for (AchievementRow r : rows) {
                Row dataRow = sheet.createRow(rowNum++);

                setCell(dataRow, 0, r.getEmployeeName(), dataStyle);
                setCell(dataRow, 1, r.getEmployeeEmail(), dataStyle);
                setCell(dataRow, 2, r.getManagerName(), dataStyle);
                setCell(dataRow, 3, r.getDepartment(), dataStyle);
                setCell(dataRow, 4, r.getCycleName(), dataStyle);
                setCell(dataRow, 5, r.getQuarter() != null ? r.getQuarter() : "—", dataStyle);
                setCell(dataRow, 6, r.getThrustArea(), dataStyle);
                setCell(dataRow, 7, r.getGoalTitle(), dataStyle);
                setCell(dataRow, 8, uomLabel(r.getUomType()), dataStyle);

                // Numeric cells
                setCellNum(dataRow, 9, r.getTarget(), numberStyle);
                setCellNum(dataRow, 10, r.getAchievement(), numberStyle);

                // Status with color
                Cell statusCell = dataRow.createCell(11);
                String status = r.getProgressStatus() != null ? r.getProgressStatus() : "Not Started";
                statusCell.setCellValue(progressLabel(status));
                statusCell.setCellStyle(switch (status) {
                    case "COMPLETED", "ON_TRACK" -> greenStyle;
                    case "AT_RISK" -> redStyle;
                    default -> orangeStyle;
                });

                // Score
                Cell scoreCell = dataRow.createCell(12);
                if (r.getProgressScore() != null) {
                    scoreCell.setCellValue(r.getProgressScore()
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(1, RoundingMode.HALF_UP)
                            .doubleValue());
                    scoreCell.setCellStyle(pctStyle);
                } else {
                    scoreCell.setCellValue("—");
                    scoreCell.setCellStyle(dataStyle);
                }

                setCellPct(dataRow, 13, r.getWeightage(), pctStyle);
            }

            // Column widths
            sheet.setColumnWidth(7, 10000); // Goal Title
            sheet.setColumnWidth(0, 6000);  // Employee Name
            sheet.setColumnWidth(1, 8000);  // Email
            sheet.setColumnWidth(6, 7000);  // Thrust Area

            // Auto-filter
            if (!rows.isEmpty()) {
                sheet.setAutoFilter(new CellRangeAddress(3, 3 + rows.size(), 0, headers.length - 1));
            }

            // Freeze header rows
            sheet.createFreezePane(0, 4);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Completion Report ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] generateCompletionReport(ReportFilter filter) throws IOException {
        UUID cycleId = resolveCycleId(filter.getCycleId());
        String cycleName = cycleRepository.findById(cycleId)
                .map(Cycle::getName).orElse("Unknown Cycle");

        List<User> employees = getEmployeesForFilter(filter);
        List<CompletionRow> rows = buildCompletionRows(employees, cycleId);

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFSheet sheet = wb.createSheet("Completion Dashboard");
            sheet.setDefaultColumnWidth(18);

            XSSFCellStyle titleStyle = createTitleStyle(wb);
            XSSFCellStyle headerStyle = createHeaderStyle(wb);
            XSSFCellStyle dataStyle = createDataStyle(wb);
            XSSFCellStyle pctStyle = createPctStyle(wb);
            XSSFCellStyle greenStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)198, (byte)239, (byte)206}, null));
            XSSFCellStyle orangeStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)255, (byte)235, (byte)156}, null));
            XSSFCellStyle redStyle = createStatusStyle(wb, new XSSFColor(new byte[]{(byte)255, (byte)199, (byte)206}, null));

            int rowNum = 0;

            Row titleRow = sheet.createRow(rowNum++);
            titleRow.setHeight((short) 600);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("AtomQuest — Completion Dashboard: " + cycleName);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 12));

            Row dateRow = sheet.createRow(rowNum++);
            dateRow.createCell(0).setCellValue(
                    "Generated: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
            rowNum++;

            // Summary stats
            int totalEmployees = rows.size();
            long fullyCompleted = rows.stream()
                    .filter(r -> r.getCheckedInQ1() > 0 && r.getCheckedInQ2() > 0
                            && r.getCheckedInQ3() > 0 && r.getCheckedInQ4() > 0)
                    .count();
            Row summaryRow = sheet.createRow(rowNum++);
            summaryRow.createCell(0).setCellValue(
                    "Total Employees: " + totalEmployees +
                            " | Fully Completed All Quarters: " + fullyCompleted +
                            " (" + (totalEmployees > 0 ? 100 * fullyCompleted / totalEmployees : 0) + "%)");
            rowNum++;

            // Headers
            Row headerRow = sheet.createRow(rowNum++);
            headerRow.setHeight((short) 500);
            String[] headers = {
                    "Employee Name", "Email", "Department", "Manager",
                    "Approved Goals",
                    "Q1 Check-ins", "Q1 Completion %",
                    "Q2 Check-ins", "Q2 Completion %",
                    "Q3 Check-ins", "Q3 Completion %",
                    "Q4 Check-ins", "Q4 Completion %",
                    "Overall Score (%)"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            for (CompletionRow r : rows) {
                Row dataRow = sheet.createRow(rowNum++);
                setCell(dataRow, 0, r.getEmployeeName(), dataStyle);
                setCell(dataRow, 1, r.getEmployeeEmail(), dataStyle);
                setCell(dataRow, 2, r.getDepartment(), dataStyle);
                setCell(dataRow, 3, r.getManagerName(), dataStyle);

                Cell approvedCell = dataRow.createCell(4);
                approvedCell.setCellValue(r.getApprovedGoals());
                approvedCell.setCellStyle(dataStyle);

                writeQRow(dataRow, 5, r.getCheckedInQ1(), r.getQ1Pct(), r.getApprovedGoals(),
                        pctStyle, dataStyle, greenStyle, orangeStyle, redStyle);
                writeQRow(dataRow, 7, r.getCheckedInQ2(), r.getQ2Pct(), r.getApprovedGoals(),
                        pctStyle, dataStyle, greenStyle, orangeStyle, redStyle);
                writeQRow(dataRow, 9, r.getCheckedInQ3(), r.getQ3Pct(), r.getApprovedGoals(),
                        pctStyle, dataStyle, greenStyle, orangeStyle, redStyle);
                writeQRow(dataRow, 11, r.getCheckedInQ4(), r.getQ4Pct(), r.getApprovedGoals(),
                        pctStyle, dataStyle, greenStyle, orangeStyle, redStyle);

                Cell scoreCell = dataRow.createCell(13);
                if (r.getOverallProgressScore() != null) {
                    scoreCell.setCellValue(r.getOverallProgressScore()
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(1, RoundingMode.HALF_UP).doubleValue());
                    scoreCell.setCellStyle(pctStyle);
                }
            }

            sheet.setColumnWidth(0, 6000);
            sheet.setColumnWidth(1, 8000);
            if (!rows.isEmpty()) {
                sheet.setAutoFilter(new CellRangeAddress(4, 4 + rows.size(), 0, headers.length - 1));
            }
            sheet.createFreezePane(0, 5);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<Goal> getGoalsForFilter(ReportFilter filter, UUID cycleId) {
        String role = filter.getRequesterRole();
        UUID rid = UUID.fromString(filter.getRequesterId());

        if ("ROLE_EMPLOYEE".equals(role)) {
            return goalRepository.findByEmployeeIdAndCycleId(rid, cycleId);
        }

        if ("ROLE_MANAGER".equals(role)) {
            // Managers see their team (and can optionally filter further)
            List<Goal> teamGoals = goalRepository.findTeamGoalsByCycle(rid, cycleId);
            return applyFilters(teamGoals, filter);
        }

        // ADMIN: all approved goals in the cycle
        List<Goal> allGoals = goalRepository.findAll().stream()
                .filter(g -> g.getCycle().getId().equals(cycleId))
                .collect(Collectors.toList());
        return applyFilters(allGoals, filter);
    }

    private List<Goal> applyFilters(List<Goal> goals, ReportFilter filter) {
        return goals.stream()
                .filter(g -> filter.getEmployeeId() == null
                        || g.getEmployee().getId().equals(filter.getEmployeeId()))
                .filter(g -> filter.getManagerId() == null
                        || (g.getEmployee().getManager() != null
                        && g.getEmployee().getManager().getId().equals(filter.getManagerId())))
                .filter(g -> filter.getDepartment() == null
                        || filter.getDepartment().equals(g.getEmployee().getDepartment()))
                .collect(Collectors.toList());
    }

    private List<User> getEmployeesForFilter(ReportFilter filter) {
        String role = filter.getRequesterRole();
        UUID rid = UUID.fromString(filter.getRequesterId());

        if ("ROLE_MANAGER".equals(role)) {
            return userRepository.findActiveReportees(rid);
        }
        // ADMIN: all employees
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ROLE_EMPLOYEE && u.isActive())
                .collect(Collectors.toList());
    }

    private List<CompletionRow> buildCompletionRows(List<User> employees, UUID cycleId) {
        List<CompletionRow> rows = new ArrayList<>();
        for (User emp : employees) {
            List<Goal> approved = goalRepository.findByEmployeeIdAndCycleId(emp.getId(), cycleId)
                    .stream().filter(g -> g.getStatus() == GoalStatus.APPROVED)
                    .collect(Collectors.toList());

            List<Checkin> allCheckins = checkinRepository.findByEmployeeAndCycle(emp.getId(), cycleId);

            Map<Quarter, Long> qCounts = new EnumMap<>(Quarter.class);
            for (Quarter q : Quarter.values()) {
                long count = allCheckins.stream().filter(c -> c.getQuarter() == q).count();
                qCounts.put(q, count);
            }

            int total = approved.size();
            BigDecimal q1Pct = pct(qCounts.getOrDefault(Quarter.Q1, 0L).intValue(), total);
            BigDecimal q2Pct = pct(qCounts.getOrDefault(Quarter.Q2, 0L).intValue(), total);
            BigDecimal q3Pct = pct(qCounts.getOrDefault(Quarter.Q3, 0L).intValue(), total);
            BigDecimal q4Pct = pct(qCounts.getOrDefault(Quarter.Q4, 0L).intValue(), total);

            // Weighted progress score
            Map<UUID, BigDecimal> best = new HashMap<>();
            for (Checkin c : allCheckins) {
                if (c.getProgressScore() != null)
                    best.merge(c.getGoal().getId(), c.getProgressScore(), BigDecimal::max);
            }
            BigDecimal totalWt = approved.stream().map(Goal::getWeightage)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal score = BigDecimal.ZERO;
            for (Goal g : approved) {
                score = score.add(g.getWeightage().multiply(
                        best.getOrDefault(g.getId(), BigDecimal.ZERO)));
            }
            BigDecimal overallScore = totalWt.compareTo(BigDecimal.ZERO) > 0
                    ? score.divide(totalWt, 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            rows.add(CompletionRow.builder()
                    .employeeName(emp.getName())
                    .employeeEmail(emp.getEmail())
                    .department(emp.getDepartment())
                    .managerName(emp.getManager() != null ? emp.getManager().getName() : "—")
                    .approvedGoals(total)
                    .checkedInQ1(qCounts.getOrDefault(Quarter.Q1, 0L).intValue())
                    .checkedInQ2(qCounts.getOrDefault(Quarter.Q2, 0L).intValue())
                    .checkedInQ3(qCounts.getOrDefault(Quarter.Q3, 0L).intValue())
                    .checkedInQ4(qCounts.getOrDefault(Quarter.Q4, 0L).intValue())
                    .q1Pct(q1Pct).q2Pct(q2Pct).q3Pct(q3Pct).q4Pct(q4Pct)
                    .overallProgressScore(overallScore)
                    .build());
        }
        rows.sort(Comparator.comparing(CompletionRow::getEmployeeName));
        return rows;
    }

    private AchievementRow buildAchievementRow(Goal g, Checkin c) {
        return AchievementRow.builder()
                .employeeName(g.getEmployee().getName())
                .employeeEmail(g.getEmployee().getEmail())
                .managerName(g.getEmployee().getManager() != null
                        ? g.getEmployee().getManager().getName() : "—")
                .department(g.getEmployee().getDepartment())
                .cycleName(g.getCycle().getName())
                .quarter(c != null ? c.getQuarter().name() : null)
                .thrustArea(g.getThrustArea())
                .goalTitle(g.getTitle())
                .uomType(g.getUomType().name())
                .target(g.getTarget())
                .achievement(c != null ? c.getAchievement() : null)
                .completionDate(c != null ? c.getCompletionDate() : null)
                .progressStatus(c != null ? c.getProgress().name() : null)
                .progressScore(c != null ? c.getProgressScore() : null)
                .weightage(g.getWeightage())
                .goalStatus(g.getStatus().name())
                .build();
    }

    // ── POI cell helpers ──────────────────────────────────────────────────────

    private void setCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private void setCellNum(Row row, int col, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) cell.setCellValue(value.doubleValue());
        else cell.setCellValue("—");
        cell.setCellStyle(style);
    }

    private void setCellPct(Row row, int col, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) cell.setCellValue(value.doubleValue());
        cell.setCellStyle(style);
    }

    private void writeQRow(Row row, int startCol, int checkins, BigDecimal pct, int total,
                           CellStyle pctStyle, CellStyle dataStyle,
                           CellStyle greenStyle, CellStyle orangeStyle, CellStyle redStyle) {
        Cell countCell = row.createCell(startCol);
        countCell.setCellValue(checkins + "/" + total);
        countCell.setCellStyle(dataStyle);

        Cell pctCell = row.createCell(startCol + 1);
        if (pct != null) pctCell.setCellValue(pct.doubleValue());
        pctCell.setCellStyle(pct != null && pct.doubleValue() >= 80 ? greenStyle
                : pct != null && pct.doubleValue() >= 50 ? orangeStyle : redStyle);
    }

    // ── POI style factories ───────────────────────────────────────────────────

    private XSSFCellStyle createTitleStyle(XSSFWorkbook wb) {
        XSSFCellStyle s = wb.createCellStyle();
        XSSFFont f = wb.createFont();
        f.setBold(true); f.setFontHeightInPoints((short) 14);
        f.setColor(new XSSFColor(new byte[]{(byte)26, (byte)35, (byte)126}, null)); // Indigo
        s.setFont(f);
        s.setFillForegroundColor(new XSSFColor(new byte[]{(byte)232, (byte)234, (byte)246}, null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setAlignment(HorizontalAlignment.LEFT);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        return s;
    }

    private XSSFCellStyle createHeaderStyle(XSSFWorkbook wb) {
        XSSFCellStyle s = wb.createCellStyle();
        XSSFFont f = wb.createFont();
        f.setBold(true); f.setColor(IndexedColors.WHITE.getIndex());
        s.setFont(f);
        s.setFillForegroundColor(new XSSFColor(new byte[]{(byte)26, (byte)35, (byte)126}, null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(s);
        return s;
    }

    private XSSFCellStyle createDataStyle(XSSFWorkbook wb) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setWrapText(false);
        setBorder(s);
        return s;
    }

    private XSSFCellStyle createNumberStyle(XSSFWorkbook wb) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));
        s.setAlignment(HorizontalAlignment.RIGHT);
        setBorder(s);
        return s;
    }

    private XSSFCellStyle createPctStyle(XSSFWorkbook wb) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setDataFormat(wb.createDataFormat().getFormat("0.0"));
        s.setAlignment(HorizontalAlignment.RIGHT);
        setBorder(s);
        return s;
    }

    private XSSFCellStyle createStatusStyle(XSSFWorkbook wb, XSSFColor bgColor) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(bgColor);
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setAlignment(HorizontalAlignment.CENTER);
        setBorder(s);
        return s;
    }

    private void setBorder(XSSFCellStyle s) {
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID resolveCycleId(UUID cycleId) {
        if (cycleId != null) return cycleId;
        return cycleRepository
                .findFirstByStatusOrderByStartDateDesc(CycleStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("No active cycle"))
                .getId();
    }

    private BigDecimal pct(int numerator, int denominator) {
        if (denominator == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(numerator * 100L)
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
    }

    private String uomLabel(String uom) {
        if (uom == null) return "";
        return switch (uom) {
            case "NUMERIC_MIN"    -> "Numeric (Higher Better)";
            case "NUMERIC_MAX"    -> "Numeric (Lower Better)";
            case "PERCENTAGE_MIN" -> "% (Higher Better)";
            case "PERCENTAGE_MAX" -> "% (Lower Better)";
            case "TIMELINE"       -> "Timeline (Date)";
            case "ZERO_BASED"     -> "Zero-based";
            default -> uom;
        };
    }

    private String progressLabel(String status) {
        if (status == null) return "Not Started";
        return switch (status) {
            case "NOT_STARTED" -> "Not Started";
            case "ON_TRACK"    -> "On Track";
            case "COMPLETED"   -> "Completed";
            case "AT_RISK"     -> "At Risk";
            default -> status;
        };
    }
}