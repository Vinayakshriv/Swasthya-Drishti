import { HealthCentre, Issue, HealthCentreAnalysis, DistrictSummary, MpUpdatesAndStatus, MpNeedsCorrection, MpNeedsCorrectionIssue, DashboardOutput } from "./types";

/**
 * Calculates days between two date strings (YYYY-MM-DD)
 */
export function getDaysDifference(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Run deterministic rule-based analysis on the health-centre data.
 * Adheres strictly to the user's provided rules.
 */
export function runDeterministicAnalysis(centres: HealthCentre[], currentDate: string = "2026-07-05"): DashboardOutput {
  const healthCentreAnalysis: HealthCentreAnalysis[] = [];

  // Tracks critical issues across health centres to flag recurring ones (appears in 2 or more centres)
  const criticalIssuesCount: Record<string, { count: number; affected: string[] }> = {
    "Low Bed Availability": { count: 0, affected: [] },
    "Poor Doctor Attendance": { count: 0, affected: [] },
    "Essential Medicine Stockout": { count: 0, affected: [] },
    "Expired Medicines": { count: 0, affected: [] },
  };

  for (const centre of centres) {
    const issues: Issue[] = [];
    let overallStatus: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" = "GOOD";

    // 1. Bed Availability
    const bedPct = centre.beds.total > 0 ? (centre.beds.available / centre.beds.total) * 100 : 0;
    if (bedPct < 10) {
      overallStatus = "CRITICAL";
      issues.push({
        category: "beds",
        severity: "critical",
        message: `Critical bed shortage: Only ${centre.beds.available} out of ${centre.beds.total} beds are available (${bedPct.toFixed(1)}%).`,
        recommendedAction: "Immediately discharge stable patients, refer new non-emergency cases to neighboring facilities, and request emergency bed expansion.",
      });
      criticalIssuesCount["Low Bed Availability"].count++;
      criticalIssuesCount["Low Bed Availability"].affected.push(centre.name);
    } else if (bedPct < 20) {
      overallStatus = "NEEDS_ATTENTION";
      issues.push({
        category: "beds",
        severity: "medium",
        message: `Low bed availability: ${centre.beds.available} out of ${centre.beds.total} beds left (${bedPct.toFixed(1)}%).`,
        recommendedAction: "Monitor admissions closely, prepare standby ward, and alert district administration.",
      });
    }

    // 2. Doctor Attendance
    const docPct = centre.doctors.total > 0 ? (centre.doctors.present / centre.doctors.total) * 100 : 0;
    if (docPct < 60) {
      overallStatus = "CRITICAL";
      issues.push({
        category: "doctor_attendance",
        severity: "critical",
        message: `Critical doctor absenteeism: Attendance is at ${docPct.toFixed(1)}% (${centre.doctors.present}/${centre.doctors.total} doctors present).`,
        recommendedAction: "Issue show-cause notices to absent doctors, request emergency backup doctors from the district pool, and redeploy nursing staff.",
      });
      criticalIssuesCount["Poor Doctor Attendance"].count++;
      criticalIssuesCount["Poor Doctor Attendance"].affected.push(centre.name);
    } else if (docPct < 80) {
      if (overallStatus !== "CRITICAL") overallStatus = "NEEDS_ATTENTION";
      issues.push({
        category: "doctor_attendance",
        severity: "medium",
        message: `Sub-optimal doctor attendance: ${docPct.toFixed(1)}% (${centre.doctors.present}/${centre.doctors.total} doctors present).`,
        recommendedAction: "Review leave logs, rearrange shifts, and seek temporary personnel support.",
      });
    }

    // 3. Medicine Stock & Expiry
    let stockStatus: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" = "GOOD";
    let expiryStatus: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" = "GOOD";

    for (const med of centre.medicines) {
      // Stock rule
      if (med.stock === 0 && med.isEssential) {
        stockStatus = "CRITICAL";
        issues.push({
          category: "medicine_stock",
          severity: "critical",
          message: `Zero stock for essential medicine: ${med.name}.`,
          recommendedAction: `Procure ${med.name} immediately via local emergency purchase funds or request emergency transfers from nearest CHC.`,
        });
      } else if (med.stock <= med.minStock) {
        if (stockStatus !== "CRITICAL") stockStatus = "NEEDS_ATTENTION";
        issues.push({
          category: "medicine_stock",
          severity: "low",
          message: `Low stock for ${med.name}: Current stock is ${med.stock} (Min threshold: ${med.minStock}).`,
          recommendedAction: `Initiate requisition order for ${med.name} from the district warehouse.`,
        });
      }

      // Expiry rule
      const daysToExpiry = getDaysDifference(currentDate, med.expiryDate);
      if (daysToExpiry < 0) {
        expiryStatus = "CRITICAL";
        issues.push({
          category: "medicine_expiry",
          severity: "critical",
          message: `Expired medicine found in stock: ${med.name} (Expired on ${med.expiryDate}).`,
          recommendedAction: `Immediately segregate and label expired ${med.name} stock, initiate disposal protocols, and procure replacement stock.`,
        });
      } else if (daysToExpiry <= 30) {
        if (expiryStatus !== "CRITICAL") expiryStatus = "NEEDS_ATTENTION";
        issues.push({
          category: "medicine_expiry",
          severity: "medium",
          message: `Medicine expiring in ${daysToExpiry} days: ${med.name} (Expires on ${med.expiryDate}).`,
          recommendedAction: `Prioritize dispensing current batch of ${med.name} and flag for replacement.`,
        });
      }
    }

    if (stockStatus === "CRITICAL" || expiryStatus === "CRITICAL") {
      overallStatus = "CRITICAL";
      if (stockStatus === "CRITICAL") {
        criticalIssuesCount["Essential Medicine Stockout"].count++;
        criticalIssuesCount["Essential Medicine Stockout"].affected.push(centre.name);
      }
      if (expiryStatus === "CRITICAL") {
        criticalIssuesCount["Expired Medicines"].count++;
        criticalIssuesCount["Expired Medicines"].affected.push(centre.name);
      }
    } else if (stockStatus === "NEEDS_ATTENTION" || expiryStatus === "NEEDS_ATTENTION") {
      if (overallStatus !== "CRITICAL") overallStatus = "NEEDS_ATTENTION";
    }

    // Formulate a robust deterministic summary (which can be refined by Gemini)
    let summary = `Health centre is operating in a ${overallStatus.toLowerCase().replace("_", " ")} state.`;
    if (issues.length > 0) {
      summary = `Identified ${issues.length} key infrastructure gaps: ${issues.map(i => i.message).join("; ")}`;
    } else {
      summary = "All infrastructure indicators are within safe thresholds. Bed capacity, doctor attendance, and essential drug stock are in optimal conditions.";
    }

    healthCentreAnalysis.push({
      healthCentreId: centre.id,
      healthCentreName: centre.name,
      status: overallStatus,
      summary,
      issues,
    });
  }

  // Calculate District Summary
  const criticalCentresCount = healthCentreAnalysis.filter(h => h.status === "CRITICAL").length;
  const needsAttentionCentresCount = healthCentreAnalysis.filter(h => h.status === "NEEDS_ATTENTION").length;
  let districtOverallStatus: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" = "GOOD";
  if (criticalCentresCount > 0) {
    districtOverallStatus = "CRITICAL";
  } else if (needsAttentionCentresCount > 0) {
    districtOverallStatus = "NEEDS_ATTENTION";
  }

  const priorityHealthCentres = healthCentreAnalysis
    .filter(h => h.status === "CRITICAL" || h.status === "NEEDS_ATTENTION")
    .map(h => h.healthCentreName);

  // Recurrent issues flag (if same issue category appears in 2 or more centres)
  const recurringIssues: string[] = [];
  for (const [key, value] of Object.entries(criticalIssuesCount)) {
    if (value.count >= 2) {
      recurringIssues.push(`${key} (affected: ${value.affected.join(", ")})`);
    }
  }

  const districtSummary: DistrictSummary = {
    overallStatus: districtOverallStatus,
    summary: `District health infrastructure is classified as ${districtOverallStatus.toLowerCase().replace("_", " ")}. Out of ${centres.length} centres, ${criticalCentresCount} require critical intervention, and ${needsAttentionCentresCount} require close monitoring.`,
    priorityHealthCentres,
    recurringIssues,
  };

  // MP Report
  const normalCentres = healthCentreAnalysis.filter(h => h.status === "GOOD").map(h => h.healthCentreName);
  const monitoringCentres = healthCentreAnalysis.filter(h => h.status === "NEEDS_ATTENTION").map(h => h.healthCentreName);
  const criticalCentres = healthCentreAnalysis.filter(h => h.status === "CRITICAL").map(h => h.healthCentreName);

  const mpUpdatesAndStatus: MpUpdatesAndStatus = {
    headline: `${districtOverallStatus === "CRITICAL" ? "URGENT:" : "UPDATE:"} Constituency Health Infrastructure Status Report`,
    summary: `Comprehensive evaluation of health systems across the constituency. Out of ${centres.length} facilities monitored, ${normalCentres.length} are in optimal condition, ${monitoringCentres.length} require regular monitoring, and ${criticalCentres.length} are experiencing acute challenges.`,
    positiveUpdates: normalCentres.length > 0 
      ? normalCentres.map(name => `${name} is operating at peak efficiency with fully compliant doctor attendance and adequate resources.`)
      : ["No health centres are fully optimal. Urgent system-wide upgrades required."],
    centresNeedingMonitoring: [...monitoringCentres, ...criticalCentres],
  };

  // MP Needs Correction
  const correctionIssues: MpNeedsCorrectionIssue[] = [];
  
  // Bed shortfalls
  const affectedBeds = healthCentreAnalysis.filter(h => h.issues.some(i => i.category === "beds" && i.severity === "critical")).map(h => h.healthCentreName);
  if (affectedBeds.length > 0) {
    correctionIssues.push({
      problem: "Severe inpatient bed shortage under 10% availability.",
      affectedHealthCentres: affectedBeds,
      impact: "Inability to accommodate emergency or critical triage, leading to high referral loads and poor patient outcomes.",
      recommendedGovernmentAction: "Mobilize district reserve bedding units and expedite construction of planned additional wards.",
    });
  }

  // Doctor attendance shortfalls
  const affectedDocs = healthCentreAnalysis.filter(h => h.issues.some(i => i.category === "doctor_attendance" && i.severity === "critical")).map(h => h.healthCentreName);
  if (affectedDocs.length > 0) {
    correctionIssues.push({
      problem: "Critical medical officer absenteeism and sub-60% attendance.",
      affectedHealthCentres: affectedDocs,
      impact: "Clinical leadership vacuum, delayed diagnostic procedures, and severe distress to rural outpatients.",
      recommendedGovernmentAction: "Implement biometrically-verified check-ins, initiate formal disciplinary review, and dispatch mobile clinical taskforces.",
    });
  }

  // Essential stockout
  const affectedStock = healthCentreAnalysis.filter(h => h.issues.some(i => i.category === "medicine_stock" && i.severity === "critical")).map(h => h.healthCentreName);
  if (affectedStock.length > 0) {
    correctionIssues.push({
      problem: "Complete stockout of essential pharmaceutical formulations.",
      affectedHealthCentres: affectedStock,
      impact: "Forced out-of-pocket patient expenditures, interruption of chronic disease regimens, and increased secondary infections.",
      recommendedGovernmentAction: "Authorize immediate local administrative emergency buyouts and audit the pharmaceutical supply-chain loop.",
    });
  }

  // Expired stock
  const affectedExpiry = healthCentreAnalysis.filter(h => h.issues.some(i => i.category === "medicine_expiry" && i.severity === "critical")).map(h => h.healthCentreName);
  if (affectedExpiry.length > 0) {
    correctionIssues.push({
      problem: "Presence of fully expired life-saving medication batches in dispensary cabinets.",
      affectedHealthCentres: affectedExpiry,
      impact: "High risk of therapeutic failure, toxic ingestion hazards, and major liability to the health administration.",
      recommendedGovernmentAction: "Conduct comprehensive inventory audits, implement absolute segregation, and issue strict instructions to pharmacists.",
    });
  }

  const mpNeedsCorrection: MpNeedsCorrection = {
    overallUrgency: criticalCentresCount > 1 ? "CRITICAL" : criticalCentresCount > 0 ? "HIGH" : needsAttentionCentresCount > 0 ? "MEDIUM" : "LOW",
    issues: correctionIssues.length > 0 ? correctionIssues : [{
      problem: "No critical systemic issues detected.",
      affectedHealthCentres: [],
      impact: "N/A",
      recommendedGovernmentAction: "Maintain regular oversight and execute routine preventive maintenance."
    }],
  };

  return {
    healthCentreAnalysis,
    districtSummary,
    mpUpdatesAndStatus,
    mpNeedsCorrection,
  };
}
