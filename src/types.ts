export interface Medicine {
  name: string;
  isEssential: boolean;
  stock: number;
  minStock: number;
  expiryDate: string; // YYYY-MM-DD
}

export interface BedConfig {
  total: number;
  available: number;
}

export interface DoctorConfig {
  total: number;
  present: number;
}

export interface HealthCentre {
  id: string;
  name: string;
  district: string;
  constituency: string;
  beds: BedConfig;
  doctors: DoctorConfig;
  medicines: Medicine[];
}

export interface Issue {
  category: "beds" | "doctor_attendance" | "medicine_stock" | "medicine_expiry";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendedAction: string;
}

export interface HealthCentreAnalysis {
  healthCentreId: string;
  healthCentreName: string;
  status: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  summary: string;
  issues: Issue[];
}

export interface DistrictSummary {
  overallStatus: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  summary: string;
  priorityHealthCentres: string[];
  recurringIssues: string[];
}

export interface MpUpdatesAndStatus {
  headline: string;
  summary: string;
  positiveUpdates: string[];
  centresNeedingMonitoring: string[];
}

export interface MpNeedsCorrectionIssue {
  problem: string;
  affectedHealthCentres: string[];
  impact: string;
  recommendedGovernmentAction: string;
}

export interface MpNeedsCorrection {
  overallUrgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  issues: MpNeedsCorrectionIssue[];
}

export interface DashboardOutput {
  healthCentreAnalysis: HealthCentreAnalysis[];
  districtSummary: DistrictSummary;
  mpUpdatesAndStatus: MpUpdatesAndStatus;
  mpNeedsCorrection: MpNeedsCorrection;
}
