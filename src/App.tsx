/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Users, 
  BedDouble, 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert, 
  Copy, 
  FileText, 
  Code, 
  RefreshCw, 
  Database,
  ArrowRight,
  UserCheck,
  CalendarDays,
  Plus,
  Trash2,
  FileCheck,
  Building2,
  Lock,
  Sparkles,
  ExternalLink,
  LogOut
} from "lucide-react";
import { SAMPLE_HEALTH_CENTRES } from "./data";
import { HealthCentre, DashboardOutput, Medicine } from "./types";
import { runDeterministicAnalysis } from "./analyzer";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [selectedLoginProfile, setSelectedLoginProfile] = useState<"patient" | "doctor" | "staff" | "incharge" | "dm" | "mp" | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  const [role, setRole] = useState<"patient" | "doctor" | "staff" | "incharge" | "dm" | "mp">("incharge");
  const [centres, setCentres] = useState<HealthCentre[]>(SAMPLE_HEALTH_CENTRES);
  const [selectedCentreId, setSelectedCentreId] = useState<string>(SAMPLE_HEALTH_CENTRES[1].id); // Rishikesh PHC as default
  const [currentDate, setCurrentDate] = useState<string>("2026-07-05");
  const [analysisResult, setAnalysisResult] = useState<DashboardOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isGeminiActive, setIsGeminiActive] = useState<boolean>(false);

  // Patient states
  const [patientName, setPatientName] = useState<string>("");
  const [patientMobile, setPatientMobile] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("Male");
  const [patientDept, setPatientDept] = useState<string>("General OPD");
  const [patientCentreId, setPatientCentreId] = useState<string>(SAMPLE_HEALTH_CENTRES[0].id);
  const [patientBookedSlip, setPatientBookedSlip] = useState<any | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");

  // Doctor states
  const [doctorSelectedCentreId, setDoctorSelectedCentreId] = useState<string>(SAMPLE_HEALTH_CENTRES[0].id);
  const [doctorOnDuty, setDoctorOnDuty] = useState<boolean>(true);
  const [doctorSelectedMedIndex, setDoctorSelectedMedIndex] = useState<number>(0);
  const [doctorDispenseQty, setDoctorDispenseQty] = useState<number>(10);
  const [doctorReports, setDoctorReports] = useState<any[]>([
    { id: "rep-1", centreId: "hc-02", category: "Medicine Shortage", comment: "Severe demand for Paracetamol 500mg due to local outbreak.", date: "2026-07-04" }
  ]);

  // Raw JSON editor state
  const [rawJsonInput, setRawJsonInput] = useState<string>(JSON.stringify(SAMPLE_HEALTH_CENTRES, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState<boolean>(false);
  const [showOutputDrawer, setShowOutputDrawer] = useState<boolean>(false);

  // Fetch or Compute Analysis
  const performAnalysis = async (currentCentres: HealthCentre[]) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          centres: currentCentres,
          currentDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
        // If Gemini is active (or has completed successfully with non-fallback data)
        setIsGeminiActive(true);
      } else {
        throw new Error("Server responded with error. Falling back to local deterministic analyzer.");
      }
    } catch (err: any) {
      console.warn("API error, executing high-fidelity local deterministic analysis.", err);
      // Fallback local deterministic check
      const localResult = runDeterministicAnalysis(currentCentres, currentDate);
      setAnalysisResult(localResult);
      setIsGeminiActive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performAnalysis(centres);
  }, [centres, currentDate]);

  // Handle data updates from direct JSON edits
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(rawJsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("Data must be a JSON Array of Health Centres.");
      }
      // Simple validation of properties
      if (parsed.length > 0) {
        const first = parsed[0];
        if (!first.id || !first.name || !first.beds || !first.doctors || !first.medicines) {
          throw new Error("Each health centre object must contain id, name, beds, doctors, and medicines.");
        }
      }
      setCentres(parsed);
      setJsonError(null);
      if (parsed.length > 0 && !parsed.some(h => h.id === selectedCentreId)) {
        setSelectedCentreId(parsed[0].id);
      }
      setShowJsonEditor(false);
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax. Please check formatting.");
    }
  };

  // Reset to original sample data
  const handleResetData = () => {
    setCentres(SAMPLE_HEALTH_CENTRES);
    setRawJsonInput(JSON.stringify(SAMPLE_HEALTH_CENTRES, null, 2));
    setSelectedCentreId(SAMPLE_HEALTH_CENTRES[1].id);
    setJsonError(null);
    performAnalysis(SAMPLE_HEALTH_CENTRES);
  };

  // Quick action: Change specific value to test rules
  const handleQuickUpdate = (centreId: string, updates: Partial<HealthCentre>) => {
    const updated = centres.map(c => {
      if (c.id === centreId) {
        return { ...c, ...updates };
      }
      return c;
    });
    setCentres(updated);
    setRawJsonInput(JSON.stringify(updated, null, 2));
  };

  const handleToggleDoctorPresence = (centreId: string, checkIn: boolean) => {
    const updated = centres.map(c => {
      if (c.id === centreId) {
        const diff = checkIn ? 1 : -1;
        const target = c.doctors.present + diff;
        const validated = Math.max(0, Math.min(c.doctors.total, target));
        return {
          ...c,
          doctors: { ...c.doctors, present: validated }
        };
      }
      return c;
    });
    setCentres(updated);
    setRawJsonInput(JSON.stringify(updated, null, 2));
  };

  const handleDispenseMedicine = (centreId: string, medicineIndex: number, quantity: number) => {
    const updated = centres.map(c => {
      if (c.id === centreId) {
        const updatedMeds = [...c.medicines];
        if (updatedMeds[medicineIndex]) {
          const currentStock = updatedMeds[medicineIndex].stock;
          const nextStock = Math.max(0, currentStock - quantity);
          updatedMeds[medicineIndex] = {
            ...updatedMeds[medicineIndex],
            stock: nextStock
          };
        }
        return {
          ...c,
          medicines: updatedMeds
        };
      }
      return c;
    });
    setCentres(updated);
    setRawJsonInput(JSON.stringify(updated, null, 2));
  };

  const handleCopyJson = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Helpers for percentages
  const getBedsAvailablePercent = (centre: HealthCentre) => {
    if (centre.beds.total === 0) return 0;
    return (centre.beds.available / centre.beds.total) * 100;
  };

  const getDoctorAttendancePercent = (centre: HealthCentre) => {
    if (centre.doctors.total === 0) return 0;
    return (centre.doctors.present / centre.doctors.total) * 100;
  };

  const getMedicineExpiryDays = (expiry: string) => {
    const d1 = new Date(currentDate);
    const d2 = new Date(expiry);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Find results for selected centre
  const currentCentreData = centres.find(c => c.id === selectedCentreId);
  const currentCentreAnalysis = analysisResult?.healthCentreAnalysis.find(a => a.healthCentreId === selectedCentreId);

  // Severity color helpers
  const getStatusBadgeClass = (status: "GOOD" | "NEEDS_ATTENTION" | "CRITICAL") => {
    switch (status) {
      case "GOOD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "NEEDS_ATTENTION":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
    }
  };

  const getSeverityIcon = (severity: "low" | "medium" | "high" | "critical") => {
    switch (severity) {
      case "critical":
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "low":
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeClass = (severity: "low" | "medium" | "high" | "critical") => {
    switch (severity) {
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  if (!isLoggedIn) {
    return (
      <div id="login-root" className="min-h-screen flex flex-col md:flex-row bg-[#080f25] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
        
        {/* Left branding panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0b1739] to-[#040a1b] p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 relative overflow-hidden">
          {/* Subtle decorative glows */}
          <div className="absolute top-[-20%] left-[-20%] w-80 h-80 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

          {/* Logo & Platform Name */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white text-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/10 border border-blue-100 flex items-center justify-center">
                <Plus className="w-8 h-8 font-black" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white font-sans flex flex-col leading-tight">
                  <span className="text-blue-400 font-bold text-lg font-mono">स्वास्थ्य दृष्टि</span>
                  <span>Swasthya Drishti</span>
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded">
                National Health Portal
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                National Health Infrastructure Monitoring Platform
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                A secure, unified decision-support platform connecting patients, clinical officers, and national representatives for a healthier India.
              </p>
            </div>

            {/* Feature benefits list */}
            <div className="space-y-4 pt-4 border-t border-slate-800/60">
              <div className="flex gap-3 items-start">
                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50 mt-0.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Real-time Metrics</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Monitor medicine inventory, bed occupancy, and staff attendance dynamically.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50 mt-0.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">AI-Powered Insights</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Gemini AI analyzes data across centres to identify critical issues before they escalate.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50 mt-0.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Multi-Tier Access</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Role-based dashboards from ground-level staff up to parliamentary representatives.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider relative z-10 pt-6">
            A Government of India Initiative Prototype
          </div>
        </div>

        {/* Right Selection / Credentials panel */}
        <div className="flex-1 bg-[#030816] p-8 md:p-16 flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-[30%] right-[-10%] w-72 h-72 rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

          <div className="w-full max-w-md space-y-6 relative z-10">
            
            {/* Upper state indicators */}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                Demo Mode Active
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Secure TLS 1.3</span>
            </div>

            {selectedLoginProfile === null ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Select Portal Role Profile</h3>
                  <p className="text-xs text-slate-400 mt-1">Choose a persona below to experience the tailored dashboard view.</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                  
                  {/* Patient Profile option */}
                  <button 
                    id="login-profile-patient"
                    onClick={() => {
                      setSelectedLoginProfile("patient");
                      setRole("patient");
                      setLoginUsername("patient@gmail.com");
                      setLoginPassword("patient123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white flex items-center justify-between">
                        <span>1. Patient / Citizen</span>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30 uppercase tracking-widest font-normal">Public Access</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Search bed availability, check drug levels, and book OPD slot tokens.</p>
                    </div>
                  </button>

                  {/* Doctor Profile option */}
                  <button 
                    id="login-profile-doctor"
                    onClick={() => {
                      setSelectedLoginProfile("doctor");
                      setRole("doctor");
                      setLoginUsername("doctor@swasthya.gov.in");
                      setLoginPassword("doctor123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-lg border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white flex items-center justify-between">
                        <span>2. Medical Doctor</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 uppercase tracking-widest font-normal">Clinician</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Submit attendance logs, dispense prescriptions, and file stock shortage reports.</p>
                    </div>
                  </button>

                  {/* Health Centre Staff option */}
                  <button 
                    id="login-profile-staff"
                    onClick={() => {
                      setSelectedLoginProfile("staff");
                      setRole("staff");
                      setLoginUsername("staff@swasthya.gov.in");
                      setLoginPassword("staff123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/20 group-hover:bg-blue-50 group-hover:text-white transition-all shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">3. Health Centre Staff</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Manage medicine stock and register bed capacity counts.</p>
                    </div>
                  </button>

                  {/* Healthcare In-charge option */}
                  <button 
                    id="login-profile-incharge"
                    onClick={() => {
                      setSelectedLoginProfile("incharge");
                      setRole("incharge");
                      setLoginUsername("incharge@swasthya.gov.in");
                      setLoginPassword("incharge123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-orange-500/10 text-orange-400 p-2.5 rounded-lg border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white flex items-center justify-between">
                        <span>4. Healthcare In-charge</span>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30 uppercase tracking-widest font-normal font-mono">AI Enabled</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Monitor medical attendance and view AI health metrics advice.</p>
                    </div>
                  </button>

                  {/* District Magistrate option */}
                  <button 
                    id="login-profile-dm"
                    onClick={() => {
                      setSelectedLoginProfile("dm");
                      setRole("dm");
                      setLoginUsername("dm@haridwar.nic.in");
                      setLoginPassword("dm123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">5. District Magistrate</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Consolidated district health audits, cross-centre failures briefing.</p>
                    </div>
                  </button>

                  {/* MP option */}
                  <button 
                    id="login-profile-mp"
                    onClick={() => {
                      setSelectedLoginProfile("mp");
                      setRole("mp");
                      setLoginUsername("mp@sansad.nic.in");
                      setLoginPassword("mp123");
                    }}
                    className="flex items-center gap-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl text-left transition-all group w-full"
                  >
                    <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">6. Member of Parliament</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Constituency executive reports, funding mandates and corrections.</p>
                    </div>
                  </button>

                </div>
              </div>
            ) : (
              <div className="space-y-5 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-white capitalize">
                      Sign In: <span className="text-indigo-400">{selectedLoginProfile.replace("_", " ")}</span>
                    </div>
                  </div>
                  <button 
                    id="btn-back-profiles"
                    onClick={() => setSelectedLoginProfile(null)}
                    className="text-[10px] text-slate-400 hover:text-white uppercase tracking-wider font-extrabold"
                  >
                    ← Change Role
                  </button>
                </div>

                {selectedLoginProfile === "patient" ? (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Patients can register or sign in with Name & Mobile below to immediately check beds, stock, and book consultations.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Your Full Name:</label>
                        <input 
                          id="login-patient-name"
                          type="text"
                          placeholder="e.g. Vinayak Kumar"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">10-Digit Mobile Number:</label>
                        <input 
                          id="login-patient-mobile"
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={patientMobile}
                          onChange={(e) => setPatientMobile(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Government Email / ID:</label>
                        <input 
                          id="login-username"
                          type="email"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Security Password:</label>
                        <input 
                          id="login-password"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Pre-authorized login credentials provided for testing compliance with specific roles.</p>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button 
                    id="btn-login-authenticate"
                    onClick={() => {
                      if (selectedLoginProfile === "patient" && (!patientName || !patientMobile)) {
                        alert("Please enter Name and Mobile to proceed as Citizen/Patient.");
                        return;
                      }
                      setIsLoggedIn(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-xs"
                  >
                    Authenticate & Access Portal
                  </button>

                  <button 
                    id="btn-login-bypass"
                    onClick={() => {
                      if (selectedLoginProfile === "patient") {
                        setPatientName("Guest Patient");
                        setPatientMobile("9999999999");
                      }
                      setIsLoggedIn(true);
                    }}
                    className="w-full text-[11px] text-slate-400 hover:text-white py-1 transition-all"
                  >
                    ⚡ Single-Click Instant Sign-In (Bypass Authentication)
                  </button>
                </div>

              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-[10px] text-slate-600">
                Authorized Use Only. System logs all remote sessions under NIC Audit Framework v4.0.
              </p>
            </div>

          </div>
        </div>

      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#fafbfc] text-gray-800 font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      
      {/* Upper Brand bar */}
      <header id="top-header" className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-orange-500 via-white to-emerald-600 p-[2px] rounded-lg shadow-sm">
              <div className="bg-slate-900 text-white p-2 rounded-[6px]">
                <Activity className="w-6 h-6 text-orange-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-orange-600 bg-orange-55 px-2 py-0.5 rounded uppercase">National Health Portal</span>
                <span className="text-[10px] text-gray-400 font-mono">v4.0-Secure</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                <span className="text-indigo-600 font-mono text-lg font-bold">स्वास्थ्य दृष्टि</span>
                <span className="text-gray-300">|</span>
                <span>Swasthya Drishti</span>
              </h1>
            </div>
          </div>

          {/* Controls: Date setting, Active Indicators */}
          <div className="flex items-center flex-wrap gap-3">
            
            {/* Current Date Trigger */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span>Assessment Date:</span>
              <input 
                id="assessment-date"
                type="date" 
                value={currentDate} 
                onChange={(e) => setCurrentDate(e.target.value)}
                className="font-mono bg-transparent border-none outline-none text-gray-900 cursor-pointer font-semibold"
              />
            </div>

            {/* Local Engine / Gemini indicator */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isGeminiActive 
                ? "bg-indigo-50/50 text-indigo-700 border-indigo-200/60" 
                : "bg-amber-50/50 text-amber-700 border-amber-200/60"
            }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isGeminiActive ? "text-indigo-500 animate-pulse" : "text-amber-500"}`} />
              <span>{isGeminiActive ? "Gemini 3.5 AI Active" : "Local Rules Engine"}</span>
            </div>

            {/* Database & JSON actions */}
            <button
              id="btn-edit-data"
              onClick={() => setShowJsonEditor(true)}
              className="flex items-center gap-1.5 bg-gray-950 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              Edit Infrastructure Data
            </button>

            <button
              id="btn-view-output"
              onClick={() => setShowOutputDrawer(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 px-3.5 py-2 rounded-lg transition-all"
            >
              <Code className="w-3.5 h-3.5 text-gray-500" />
              JSON Data
            </button>

            <button
              id="btn-portal-logout"
              onClick={() => {
                setIsLoggedIn(false);
                setSelectedLoginProfile(null);
              }}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-250 px-3.5 py-2 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Quick System Brief */}
        <div className="mb-8 p-4 bg-gradient-to-r from-gray-900 to-slate-800 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Active Territory Scope</span>
            <h2 className="text-lg font-bold">Haridwar Constituency & District Summary</h2>
            <p className="text-xs text-slate-300 mt-1">
              Monitoring <span className="font-semibold">{centres.length} primary health facilities</span> serving over 1.8M citizens in Uttarakhand.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              id="btn-reset-data"
              onClick={handleResetData}
              className="text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 px-3.5 py-2 rounded-lg transition-all font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Original Set
            </button>
          </div>
        </div>

        {/* Segmented Control for Role Switching */}
        <div className="mb-8">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">View Portal as User Role:</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200/50">
            
            {/* Patient */}
            <button
              id="role-patient"
              onClick={() => setRole("patient")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "patient"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              Patient/Citizen
            </button>

            {/* Doctor */}
            <button
              id="role-doctor"
              onClick={() => setRole("doctor")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "doctor"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <Activity className="w-4 h-4 text-amber-500" />
              Medical Doctor
            </button>

            {/* Health Centre Staff */}
            <button
              id="role-staff"
              onClick={() => setRole("staff")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "staff"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <Lock className="w-4 h-4 text-blue-500" />
              Staff
            </button>

            {/* Healthcare In-charge */}
            <button
              id="role-incharge"
              onClick={() => setRole("incharge")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "incharge"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <Building2 className="w-4 h-4 text-orange-500" />
              In-charge
            </button>

            {/* District Magistrate */}
            <button
              id="role-dm"
              onClick={() => setRole("dm")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "dm"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <FileCheck className="w-4 h-4 text-indigo-500" />
              Magistrate
            </button>

            {/* MP */}
            <button
              id="role-mp"
              onClick={() => setRole("mp")}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg text-[11px] font-bold transition-all ${
                role === "mp"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              MP Dashboard
            </button>
          </div>
        </div>

        {/* ROLE-SPECIFIC SCREENS CONTAINER */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 min-h-[500px]">
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading-spinner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-gray-600">Generating analytics feed...</p>
                <p className="text-xs text-gray-400 mt-1">Running compliance matrices and drafting government summaries.</p>
              </motion.div>
            ) : (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                
                
                {/* PATIENT/CITIZEN SCREEN */}
                {role === "patient" && (
                  <div id="screen-patient" className="space-y-8 animate-fadeIn">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" />
                        Citizen & Patient Portal
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mt-1">Real-time Healthcare Access</h3>
                      <p className="text-xs text-gray-500 mt-1">Check hospital bed availability, look up essential drug stock levels, and book OPD slot tokens instantly.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left 2 Cols: Centre Status & Medicines Search */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Medicine Stock Look Up */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Pill className="w-4 h-4 text-indigo-500" />
                            Check Live Medicine Availability
                          </h4>
                          <div className="flex gap-2">
                            <input 
                              id="patient-med-search"
                              type="text"
                              placeholder="Search formulation (e.g. Paracetamol, Amoxicillin, Insulin)..."
                              value={patientSearchQuery}
                              onChange={(e) => setPatientSearchQuery(e.target.value)}
                              className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                            />
                            {patientSearchQuery && (
                              <button 
                                id="btn-clear-med-search"
                                onClick={() => setPatientSearchQuery("")}
                                className="text-xs bg-gray-100 hover:bg-gray-200 px-3.5 rounded-xl font-bold transition-all text-gray-700"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            {centres.map(centre => {
                              const matchingMeds = centre.medicines.filter(m => 
                                m.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
                              );
                              if (patientSearchQuery && matchingMeds.length === 0) return null;

                              return (
                                <div key={centre.id} className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{centre.name}</span>
                                    <div className="text-xs font-bold text-gray-800">
                                      {patientSearchQuery ? `${matchingMeds.length} formulations matched` : "Pharmacy Stock Overview"}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(patientSearchQuery ? matchingMeds : centre.medicines).map((med, idx) => (
                                      <span key={idx} className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                                        med.stock === 0 
                                          ? "bg-rose-50 text-rose-700 border-rose-100" 
                                          : med.stock < med.minStock 
                                            ? "bg-amber-50 text-amber-700 border-amber-100" 
                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      }`}>
                                        {med.name}: <strong className="font-bold">{med.stock} units</strong> {med.stock === 0 ? "(Out of Stock)" : med.stock < med.minStock ? "(Low Stock)" : "(Available)"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Live Facility Beds Overview */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                            <BedDouble className="w-4 h-4 text-emerald-500" />
                            Live Bed Availabilities in Haridwar block facilities
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {centres.map(centre => {
                              const bedPct = getBedsAvailablePercent(centre);
                              return (
                                <div key={centre.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs space-y-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-800">{centre.name}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                      bedPct < 10 ? "bg-rose-100 text-rose-800" : bedPct < 20 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {bedPct < 10 ? "Critical" : bedPct < 20 ? "Needs Attention" : "Optimal"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-gray-500">Available Beds:</span>
                                    <span className="text-gray-900">{centre.beds.available} / {centre.beds.total}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${bedPct < 10 ? "bg-rose-500" : bedPct < 20 ? "bg-amber-500" : "bg-emerald-500"}`}
                                      style={{ width: `${Math.min(100, bedPct)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* Right Col: Booking Slot widget */}
                      <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white p-5 rounded-2xl shadow-md space-y-4">
                          <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-white/10 pb-2 text-indigo-300">
                            <CalendarDays className="w-4 h-4 text-indigo-400" />
                            Book OPD Consultation Token
                          </h4>

                          {patientBookedSlip ? (
                            <div className="space-y-4">
                              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                                <div className="text-xs font-bold text-emerald-300">OPD Slot Successfully Confirmed!</div>
                              </div>
                              
                              {/* Slip Card */}
                              <div className="bg-white text-slate-900 p-4 rounded-xl space-y-3 shadow-md border-t-4 border-indigo-600 font-sans">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                  <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase">Swasthya Drishti OPD Slip</span>
                                  <span className="text-[10px] font-bold text-emerald-600">TOKEN #{patientBookedSlip.token}</span>
                                </div>
                                
                                <div className="space-y-1.5 text-xs">
                                  <div><span className="text-gray-400 font-medium">Patient Name:</span> <strong className="font-bold text-gray-800">{patientBookedSlip.name}</strong></div>
                                  <div><span className="text-gray-400 font-medium">Digital ABHA ID:</span> <strong className="font-mono text-gray-800">{patientBookedSlip.abhaId}</strong></div>
                                  <div><span className="text-gray-400 font-medium">PHC Centre:</span> <strong className="font-bold text-gray-800">{patientBookedSlip.centreName}</strong></div>
                                  <div><span className="text-gray-400 font-medium">OPD Department:</span> <strong className="font-semibold text-gray-700">{patientBookedSlip.dept}</strong></div>
                                  <div><span className="text-gray-400 font-medium">Schedule Date:</span> <strong className="font-mono text-gray-750">{patientBookedSlip.date}</strong></div>
                                </div>

                                {/* CSS Barcode */}
                                <div className="border-t border-gray-100 pt-3 flex flex-col items-center">
                                  <div className="flex gap-[2px] h-8 w-full justify-center bg-gray-50 p-1">
                                    {[1,3,1,2,1,4,1,2,3,1,2,1,1,3,1,2,4,1,2,1].map((w, i) => (
                                      <div key={i} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                                    ))}
                                  </div>
                                  <span className="text-[9px] font-mono tracking-wider text-gray-400 mt-1">{patientBookedSlip.slipId}</span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  id="btn-print-slip"
                                  onClick={() => alert("Digital token dispatched & queued on local facility servers successfully.")}
                                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                >
                                  Print Slip
                                </button>
                                <button 
                                  id="btn-book-another"
                                  onClick={() => setPatientBookedSlip(null)}
                                  className="w-full text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 py-2 rounded-xl transition-all cursor-pointer"
                                >
                                  Book New
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Patient Full Name:</label>
                                <input 
                                  id="booking-name"
                                  type="text"
                                  placeholder="Enter full name"
                                  value={patientName}
                                  onChange={(e) => setPatientName(e.target.value)}
                                  className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Age:</label>
                                  <input 
                                    id="booking-age"
                                    type="number"
                                    placeholder="e.g. 28"
                                    value={patientAge}
                                    onChange={(e) => setPatientAge(e.target.value)}
                                    className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Gender:</label>
                                  <select 
                                    id="booking-gender"
                                    value={patientGender}
                                    onChange={(e) => setPatientGender(e.target.value)}
                                    className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                  >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number:</label>
                                <input 
                                  id="booking-mobile"
                                  type="tel"
                                  placeholder="10-digit mobile"
                                  value={patientMobile}
                                  onChange={(e) => setPatientMobile(e.target.value)}
                                  className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Target Health Centre:</label>
                                <select 
                                  id="booking-centre"
                                  value={patientCentreId}
                                  onChange={(e) => setPatientCentreId(e.target.value)}
                                  className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                                >
                                  {centres.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Department:</label>
                                <select 
                                  id="booking-dept"
                                  value={patientDept}
                                  onChange={(e) => setPatientDept(e.target.value)}
                                  className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-white"
                                >
                                  <option>General OPD</option>
                                  <option>Pediatrics</option>
                                  <option>Dermatology</option>
                                  <option>Emergency Services</option>
                                  <option>Dental Clinic</option>
                                </select>
                              </div>

                              <button 
                                id="btn-submit-booking"
                                onClick={() => {
                                  if (!patientName || !patientMobile) {
                                    alert("Please fill in Name and Mobile Number to generate OPD token.");
                                    return;
                                  }
                                  const matchedC = centres.find(c => c.id === patientCentreId);
                                  const randomToken = Math.floor(Math.random() * 25) + 3;
                                  const randomSlipId = "SD-" + Math.floor(100000 + Math.random() * 900000);
                                  const randomAbha = "91-" + Math.floor(1000 + Math.random() * 8999) + "-" + Math.floor(1000 + Math.random() * 8999) + "-" + Math.floor(1000 + Math.random() * 8999);
                                  setPatientBookedSlip({
                                    name: patientName,
                                    mobile: patientMobile,
                                    age: patientAge || "N/A",
                                    gender: patientGender,
                                    dept: patientDept,
                                    centreName: matchedC ? matchedC.name : "Local PHC",
                                    date: currentDate,
                                    token: randomToken,
                                    slipId: randomSlipId,
                                    abhaId: randomAbha
                                  });
                                }}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md"
                              >
                                Generate Swasthya Token
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DOCTOR SCREEN */}
                {role === "doctor" && (
                  <div id="screen-doctor" className="space-y-8 animate-fadeIn">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5" />
                        Medical Doctors Terminal
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mt-1">Clinical Operations & Live Prescriber</h3>
                      <p className="text-xs text-gray-500 mt-1">Check-in daily clinician duty status, write direct patient prescriptions to deduct live stock, and file instant red-flag shortage reports.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left 2 Cols: Doctor Check-in & live prescription dispenser */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Clinician Duty check-in & hospital configuration */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                            <UserCheck className="w-4 h-4 text-amber-500" />
                            Duty Check-In & Practice PHC Assignment
                          </h4>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                            <div>
                              <div className="text-xs text-gray-400 font-bold uppercase">Practice PHC:</div>
                              <select 
                                id="doctor-practice-centre"
                                value={doctorSelectedCentreId}
                                onChange={(e) => {
                                  setDoctorSelectedCentreId(e.target.value);
                                  setDoctorSelectedMedIndex(0);
                                }}
                                className="font-bold text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0 mt-0.5"
                              >
                                {centres.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-600">Your Attendance Status:</span>
                              <button 
                                id="btn-toggle-doctor-duty"
                                onClick={() => {
                                  const checkIn = !doctorOnDuty;
                                  setDoctorOnDuty(checkIn);
                                  handleToggleDoctorPresence(doctorSelectedCentreId, checkIn);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  doctorOnDuty 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {doctorOnDuty ? "🟢 Checked-In On-Duty" : "🔴 Checked-Out Off-Duty"}
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-400 italic">Changing your duty status directly increments/decrements the "Doctors Present" counts on the Live Portal and triggers compliance reports for District Magistrates.</p>
                        </div>

                        {/* Live prescription dispenser */}
                        {(() => {
                          const matchedC = centres.find(c => c.id === doctorSelectedCentreId);
                          if (!matchedC) return null;

                          return (
                            <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Pill className="w-4 h-4 text-emerald-500" />
                                Live Prescription Pad & Stock Dispenser
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Select Available Formulation:</label>
                                    <select 
                                      id="doctor-select-medicine"
                                      value={doctorSelectedMedIndex}
                                      onChange={(e) => setDoctorSelectedMedIndex(parseInt(e.target.value))}
                                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                                    >
                                      {matchedC.medicines.map((med, idx) => (
                                        <option key={idx} value={idx}>{med.name} (Stock: {med.stock} units)</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity to Dispense:</label>
                                    <div className="flex gap-2">
                                      <input 
                                        id="doctor-dispense-qty"
                                        type="number"
                                        min="1"
                                        max={matchedC.medicines[doctorSelectedMedIndex]?.stock || 1}
                                        value={doctorDispenseQty}
                                        onChange={(e) => setDoctorDispenseQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg"
                                      />
                                      <button 
                                        id="btn-prescribe"
                                        onClick={() => {
                                          const med = matchedC.medicines[doctorSelectedMedIndex];
                                          if (!med) return;
                                          if (med.stock < doctorDispenseQty) {
                                            alert("Insufficient stock available for dispensing!");
                                            return;
                                          }
                                          handleDispenseMedicine(doctorSelectedCentreId, doctorSelectedMedIndex, doctorDispenseQty);
                                          alert(`Prescribed and deducted ${doctorDispenseQty} units of ${med.name} from live PHC stock.`);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-lg transition-colors cursor-pointer"
                                      >
                                        Dispense
                                      </button>
                                    </div>
                                    <span className="text-[9px] text-gray-400">Dispensing drugs deducts inventory in real-time. If stock falls below safety threshold, low-stock notifications are raised.</span>
                                  </div>
                                </div>

                                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/40 text-xs text-amber-900 leading-relaxed space-y-2">
                                  <div className="font-bold uppercase text-[9px] text-amber-700">PHC Pharmacy Live Stock:</div>
                                  <div className="space-y-1.5 font-mono max-h-[120px] overflow-y-auto pr-1">
                                    {matchedC.medicines.map((med, idx) => (
                                      <div key={idx} className="flex justify-between border-b border-amber-200/10 pb-1">
                                        <span>{med.name}:</span>
                                        <span className={`font-bold ${med.stock === 0 ? "text-rose-600" : med.stock < med.minStock ? "text-amber-600" : "text-emerald-700"}`}>{med.stock} units</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      </div>

                      {/* Right Col: doctor report submission widget */}
                      <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4 border border-slate-800">
                          <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2 text-rose-400">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            File Red-Flag Shortage Incident Report
                          </h4>

                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Incident Category:</label>
                              <select 
                                id="doctor-report-category"
                                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none"
                              >
                                <option>Medicine Shortage</option>
                                <option>Critical Patient Overload</option>
                                <option>Power Failure / Cold Chain Risk</option>
                                <option>Infrastructure Damage / Repair Needed</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Comments / Clinician Assessment:</label>
                              <textarea 
                                id="doctor-report-comment"
                                rows={3}
                                placeholder="Type details (e.g. Sudden viral outbreak, emergency stock needed)..."
                                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:outline-none"
                              />
                            </div>

                            <button 
                              id="btn-submit-doctor-report"
                              onClick={() => {
                                const categoryEl = document.getElementById("doctor-report-category") as HTMLSelectElement;
                                const commentEl = document.getElementById("doctor-report-comment") as HTMLTextAreaElement;
                                if (!commentEl || !commentEl.value) {
                                  alert("Please enter comments before filing report.");
                                  return;
                                }
                                const newReport = {
                                  id: "rep-" + Date.now(),
                                  centreId: doctorSelectedCentreId,
                                  category: categoryEl.value,
                                  comment: commentEl.value,
                                  date: currentDate
                                };
                                setDoctorReports([newReport, ...doctorReports]);
                                commentEl.value = "";
                                alert("Red-flag filed successfully! Your assessment has been dispatched to the District Magistrate and Healthcare In-charge dashboards.");
                              }}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Submit Live Red-Flag
                            </button>
                          </div>
                        </div>

                        {/* Doctor reports log */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-3 shadow-xs">
                          <h4 className="font-bold text-gray-950 text-xs uppercase tracking-wider border-b border-gray-100 pb-1.5">
                            Your Dispatched Red-Flags ({doctorReports.length})
                          </h4>
                          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                            {doctorReports.map(rep => {
                              const matchedC = centres.find(c => c.id === rep.centreId);
                              return (
                                <div key={rep.id} className="bg-slate-50 p-3 rounded-lg border border-slate-250/60 text-[11px] space-y-1">
                                  <div className="flex justify-between items-center text-slate-400 font-bold text-[9px] uppercase">
                                    <span>{matchedC ? matchedC.name : "PHC"}</span>
                                    <span>{rep.date}</span>
                                  </div>
                                  <div className="font-bold text-rose-700">{rep.category}</div>
                                  <p className="text-gray-600 italic">"{rep.comment}"</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* 1. HEALTH CENTRE STAFF SCREEN */}
                {role === "staff" && (
                  <div id="screen-staff" className="space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5" />
                        Staff Terminal (No AI Feedback Authorized)
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mt-1">Resource & Stock Registration</h3>
                      <p className="text-xs text-gray-500 mt-1">Authorized for ground staff inputs, basic resource counting, and active inventory tracking.</p>
                    </div>

                    {/* Centre selector */}
                    <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase px-2">Select Your Centre:</span>
                      {centres.map((c) => (
                        <button
                          id={`staff-select-${c.id}`}
                          key={c.id}
                          onClick={() => setSelectedCentreId(c.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            selectedCentreId === c.id
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>

                    {currentCentreData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        
                        {/* Bed Availability Indicator */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-xl space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                              <BedDouble className="w-4 h-4 text-blue-500" />
                              Bed Capacity Log
                            </h4>
                            <span className="text-xs font-mono font-bold text-gray-500">Beds Status</span>
                          </div>

                          <div className="bg-blue-50/50 rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-black text-blue-700">{currentCentreData.beds.available}</span>
                              <span className="text-sm text-blue-600 font-semibold"> / {currentCentreData.beds.total} Available</span>
                            </div>
                            <span className="text-xs font-bold bg-blue-100/70 text-blue-800 px-2.5 py-1 rounded-full">
                              {getBedsAvailablePercent(currentCentreData).toFixed(0)}% Left
                            </span>
                          </div>

                          {/* Interactive slider for testing */}
                          <div className="pt-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Simulate Available Beds:</label>
                            <div className="flex items-center gap-3">
                              <input 
                                id={`staff-bed-slider-${currentCentreData.id}`}
                                type="range" 
                                min="0" 
                                max={currentCentreData.beds.total}
                                value={currentCentreData.beds.available}
                                onChange={(e) => handleQuickUpdate(currentCentreData.id, {
                                  beds: { ...currentCentreData.beds, available: parseInt(e.target.value) }
                                })}
                                className="w-full accent-blue-600"
                              />
                              <span className="text-xs font-mono font-bold w-8">{currentCentreData.beds.available}</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Drag to change. Thresholds: Under 20% = Needs Attention; Under 10% = Critical.</span>
                          </div>
                        </div>

                        {/* Medicine Stocks Table */}
                        <div className="bg-white border border-gray-200/80 p-5 rounded-xl space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                              <Pill className="w-4 h-4 text-emerald-500" />
                              Dispensary Stocks Inventory
                            </h4>
                            <span className="text-xs font-mono font-bold text-gray-500">{currentCentreData.medicines.length} Item Formulations</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="py-2">Medicine Formulation</th>
                                  <th className="py-2">Stock Level</th>
                                  <th className="py-2">Essential?</th>
                                  <th className="py-2 text-right">Interactive Trigger</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {currentCentreData.medicines.map((med, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="py-3 font-semibold text-gray-900">{med.name}</td>
                                    <td className="py-3">
                                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                        med.stock === 0 
                                          ? "bg-rose-50 text-rose-700" 
                                          : med.stock <= med.minStock 
                                            ? "bg-amber-50 text-amber-700" 
                                            : "bg-emerald-50 text-emerald-700"
                                      }`}>
                                        {med.stock} <span className="text-[10px] text-gray-400">/ min {med.minStock}</span>
                                      </span>
                                    </td>
                                    <td className="py-3">
                                      {med.isEssential ? (
                                        <span className="bg-orange-50 text-orange-700 border border-orange-100/60 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">Yes</span>
                                      ) : (
                                        <span className="text-gray-400 text-[10px]">No</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button 
                                          id={`staff-stockout-${currentCentreData.id}-${idx}`}
                                          onClick={() => {
                                            const updatedMeds = [...currentCentreData.medicines];
                                            updatedMeds[idx].stock = 0;
                                            handleQuickUpdate(currentCentreData.id, { medicines: updatedMeds });
                                          }}
                                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px] px-1.5 py-0.5 rounded border border-rose-200"
                                        >
                                          Stockout
                                        </button>
                                        <button 
                                          id={`staff-restock-${currentCentreData.id}-${idx}`}
                                          onClick={() => {
                                            const updatedMeds = [...currentCentreData.medicines];
                                            updatedMeds[idx].stock = updatedMeds[idx].minStock * 3;
                                            handleQuickUpdate(currentCentreData.id, { medicines: updatedMeds });
                                          }}
                                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] px-1.5 py-0.5 rounded border border-emerald-200"
                                        >
                                          Restock
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* 2. HEALTHCARE IN-CHARGE SCREEN */}
                {role === "incharge" && (
                  <div id="screen-incharge" className="space-y-6">
                    <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase tracking-wider">
                          <Building2 className="w-3.5 h-3.5" />
                          Block Healthcare In-charge Terminal
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">Facility Status Oversight</h3>
                        <p className="text-xs text-gray-500 mt-1">Authorized to view detailed staffing attendance, full medicine expiries, and AI status recommendations.</p>
                      </div>

                      {/* Centre selector */}
                      <div className="flex flex-wrap gap-1 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                        {centres.map((c) => (
                          <button
                            id={`incharge-select-${c.id}`}
                            key={c.id}
                            onClick={() => setSelectedCentreId(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedCentreId === c.id
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/50"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {currentCentreData && currentCentreAnalysis && (
                      <div className="space-y-6">
                        
                        {/* Status Ribbon with AI summary */}
                        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center gap-5 justify-between ${getStatusBadgeClass(currentCentreAnalysis.status)}`}>
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] font-black tracking-widest uppercase opacity-75">Calculated AI Status</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                            </div>
                            <div className="text-2xl font-black tracking-tight">{currentCentreAnalysis.status.replace("_", " ")}</div>
                            <p className="text-sm font-medium leading-relaxed max-w-2xl text-gray-700/95">{currentCentreAnalysis.summary}</p>
                          </div>
                          
                          {/* Circle Gauge showing status */}
                          <div className="p-4 bg-white/65 backdrop-blur-xs rounded-xl flex items-center gap-3 border border-current/10 self-start md:self-auto min-w-[200px]">
                            {currentCentreAnalysis.status === "GOOD" && <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />}
                            {currentCentreAnalysis.status === "NEEDS_ATTENTION" && <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0 animate-bounce" />}
                            {currentCentreAnalysis.status === "CRITICAL" && <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0 animate-pulse" />}
                            <div>
                              <div className="text-xs font-bold text-gray-900">Infrastructure Level</div>
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">Compliant to national codes</div>
                            </div>
                          </div>
                        </div>

                        {/* Split views: Resource indicators with sliders AND AI recommendations */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Left 2 columns: Indicators (Beds, Doctors, Expiries) */}
                          <div className="lg:col-span-2 space-y-6">
                            
                            <div className="bg-white border border-gray-100 p-5 rounded-2xl space-y-5">
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Users className="w-4 h-4 text-orange-500" />
                                Medical Officers & Staff Presence
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50/60 p-4 rounded-xl flex items-center justify-between">
                                  <div>
                                    <div className="text-2xl font-black text-gray-900">{currentCentreData.doctors.present} / {currentCentreData.doctors.total}</div>
                                    <div className="text-[11px] font-semibold text-gray-500 mt-1">Physicians on Duty Today</div>
                                  </div>
                                  <div className={`px-2.5 py-1 rounded text-xs font-black font-mono ${
                                    getDoctorAttendancePercent(currentCentreData) < 60 
                                      ? "bg-rose-50 text-rose-700" 
                                      : getDoctorAttendancePercent(currentCentreData) < 80 
                                        ? "bg-amber-50 text-amber-700" 
                                        : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {getDoctorAttendancePercent(currentCentreData).toFixed(1)}% Present
                                  </div>
                                </div>

                                {/* Slider to test attendance */}
                                <div className="space-y-1 bg-gray-50/40 p-4 rounded-xl">
                                  <label className="text-[10px] font-extrabold text-gray-500 uppercase block">Simulate Present Doctors:</label>
                                  <div className="flex items-center gap-3">
                                    <input 
                                      id={`incharge-doc-slider-${currentCentreData.id}`}
                                      type="range" 
                                      min="0" 
                                      max={currentCentreData.doctors.total}
                                      value={currentCentreData.doctors.present}
                                      onChange={(e) => handleQuickUpdate(currentCentreData.id, {
                                        doctors: { ...currentCentreData.doctors, present: parseInt(e.target.value) }
                                      })}
                                      className="w-full accent-orange-500"
                                    />
                                    <span className="text-xs font-mono font-bold w-6">{currentCentreData.doctors.present}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 block">Below 80% = Needs Attention; Below 60% = Critical.</span>
                                </div>
                              </div>
                            </div>

                            {/* Medicine stock & Expiries in detail */}
                            <div className="bg-white border border-gray-100 p-5 rounded-2xl space-y-4">
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                                <CalendarDays className="w-4 h-4 text-emerald-500" />
                                Pharmacy Batches & Critical Expiries
                              </h4>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                      <th className="py-2">Formulation</th>
                                      <th className="py-2">Expiry Date</th>
                                      <th className="py-2">Days to Expiry</th>
                                      <th className="py-2 text-right">Batch Action Trigger</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {currentCentreData.medicines.map((med, idx) => {
                                      const days = getMedicineExpiryDays(med.expiryDate);
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                          <td className="py-3 font-semibold text-gray-900">
                                            <div className="flex items-center gap-1.5">
                                              <span>{med.name}</span>
                                              {days < 0 && <span className="bg-red-100 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Expired</span>}
                                              {days >= 0 && days <= 30 && <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Near Expiry</span>}
                                            </div>
                                          </td>
                                          <td className="py-3 font-mono font-semibold text-gray-600">{med.expiryDate}</td>
                                          <td className="py-3 font-mono">
                                            {days < 0 ? (
                                              <span className="text-red-600 font-bold">Expired {Math.abs(days)} days ago</span>
                                            ) : days <= 30 ? (
                                              <span className="text-amber-600 font-bold">Expires in {days} days</span>
                                            ) : (
                                              <span className="text-gray-500 font-medium">{days} days remaining</span>
                                            )}
                                          </td>
                                          <td className="py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                              <button 
                                                id={`incharge-expire-${currentCentreData.id}-${idx}`}
                                                onClick={() => {
                                                  const updatedMeds = [...currentCentreData.medicines];
                                                  // Yesterday
                                                  const yesterday = new Date(currentDate);
                                                  yesterday.setDate(yesterday.getDate() - 2);
                                                  updatedMeds[idx].expiryDate = yesterday.toISOString().split('T')[0];
                                                  handleQuickUpdate(currentCentreData.id, { medicines: updatedMeds });
                                                }}
                                                className="bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[9px] px-2 py-0.5 rounded border border-red-200"
                                              >
                                                Force Expire
                                              </button>
                                              <button 
                                                id={`incharge-renew-${currentCentreData.id}-${idx}`}
                                                onClick={() => {
                                                  const updatedMeds = [...currentCentreData.medicines];
                                                  // +1 year
                                                  const nextYear = new Date(currentDate);
                                                  nextYear.setFullYear(nextYear.getFullYear() + 1);
                                                  updatedMeds[idx].expiryDate = nextYear.toISOString().split('T')[0];
                                                  handleQuickUpdate(currentCentreData.id, { medicines: updatedMeds });
                                                }}
                                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[9px] px-2 py-0.5 rounded border border-emerald-200"
                                              >
                                                Extend Expiry
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>

                          {/* Right column: Action-oriented UI Issues List & Action Items */}
                          <div className="space-y-6">
                            
                            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
                              <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2 text-orange-400">
                                <Sparkles className="w-4 h-4 text-orange-400" />
                                Action-Oriented AI Directives
                              </h4>

                              {currentCentreAnalysis.issues.length === 0 ? (
                                <div className="py-4 text-center">
                                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                                  <p className="text-xs font-bold text-slate-200">Zero Active Violations</p>
                                  <p className="text-[10px] text-slate-400 mt-1">This facility complies fully with all sub-block indicators.</p>
                                </div>
                              ) : (
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                                  {currentCentreAnalysis.issues.map((issue, idx) => (
                                    <div key={idx} className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${getSeverityBadgeClass(issue.severity)}`}>
                                          {issue.category.replace("_", " ")}
                                        </span>
                                        {getSeverityIcon(issue.severity)}
                                      </div>
                                      <div className="text-[11px] font-bold text-slate-200">{issue.message}</div>
                                      <div className="text-[10px] text-slate-400 border-t border-slate-700/50 pt-1.5 mt-1">
                                        <span className="text-orange-300 font-extrabold uppercase">Recommended In-charge Action:</span><br/>
                                        <p className="mt-0.5 text-slate-300 italic">"{issue.recommendedAction}"</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>

                        </div>

                        {/* Live Doctors Red-Flag Logs section */}
                        <div className="bg-rose-50/40 border border-rose-200/60 p-5 rounded-2xl mt-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-rose-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                              Live Clinical Red-Flags submitted by Duty Doctors ({doctorReports.filter(r => r.centreId === currentCentreData.id).length})
                            </h4>
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">Priority Verification Pending</span>
                          </div>
                          
                          {doctorReports.filter(r => r.centreId === currentCentreData.id).length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No red-flag alerts reported today by the duty medical doctor at this facility.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {doctorReports.filter(r => r.centreId === currentCentreData.id).map(rep => (
                                <div key={rep.id} className="bg-white p-3.5 rounded-xl border border-rose-100/80 shadow-xs space-y-2">
                                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase">
                                    <span>Incident Category: <strong className="text-rose-700">{rep.category}</strong></span>
                                    <span>Filed: {rep.date}</span>
                                  </div>
                                  <p className="text-xs text-gray-700 italic">"{rep.comment}"</p>
                                  <div className="text-[9px] bg-slate-50 text-slate-500 p-1.5 rounded flex justify-between items-center">
                                    <span>Status: <strong className="text-indigo-600 font-extrabold uppercase">ESCALATED TO DM</strong></span>
                                    <button 
                                      id={`btn-acknowledge-${rep.id}`}
                                      onClick={() => alert("Acknowledgment sent to duty doctor. Action log registered on state mainframe.")}
                                      className="bg-white hover:bg-slate-100 px-2 py-0.5 border rounded text-[8px] font-bold text-gray-600 transition-all"
                                    >
                                      Acknowledge Receipt
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* 3. DISTRICT MAGISTRATE (DM) SCREEN */}
                {role === "dm" && analysisResult && (
                  <div id="screen-dm" className="space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                        <FileCheck className="w-3.5 h-3.5" />
                        District Magistrate (Oversight Portal)
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mt-1">District-Wide Health Audit Briefing</h3>
                      <p className="text-xs text-gray-500 mt-1">Consolidated reports of all {centres.length} block facilities under Haridwar District Administration.</p>
                    </div>

                    {/* District Status Panel */}
                    <div className={`p-6 rounded-2xl border ${getStatusBadgeClass(analysisResult.districtSummary.overallStatus)}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5 flex-1">
                          <span className="text-[10px] font-extrabold uppercase opacity-85 tracking-wider">District Consolidated Alert Index</span>
                          <h4 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            {analysisResult.districtSummary.overallStatus === "CRITICAL" ? "🔴 DISTRICT CRITICAL" : analysisResult.districtSummary.overallStatus === "NEEDS_ATTENTION" ? "🟡 DISTRICT NEEDS ATTENTION" : "🟢 DISTRICT OPTIMAL"}
                          </h4>
                          <p className="text-sm font-medium leading-relaxed text-gray-700/95">{analysisResult.districtSummary.summary}</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 bg-white/70 p-4 rounded-xl border border-current/15 min-w-[220px]">
                          <div className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-200/50 pb-1 mb-1">Administrative Priority List:</div>
                          {analysisResult.districtSummary.priorityHealthCentres.length === 0 ? (
                            <span className="text-xs font-semibold text-emerald-700">None. All blocks functional.</span>
                          ) : (
                            <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto">
                              {analysisResult.districtSummary.priorityHealthCentres.map((name, idx) => (
                                <span key={idx} className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                                  <span>•</span> {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Master Grid list of Block facilities */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        Constituent Health Centre Compliance Matrix
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {centres.map((centre) => {
                          const centreAnalysis = analysisResult.healthCentreAnalysis.find(a => a.healthCentreId === centre.id);
                          if (!centreAnalysis) return null;

                          return (
                            <div 
                              id={`dm-centre-card-${centre.id}`}
                              key={centre.id} 
                              className={`bg-white border rounded-xl p-4 transition-all hover:shadow-xs space-y-4 ${
                                centreAnalysis.status === "CRITICAL" 
                                  ? "border-rose-200/80 bg-rose-50/5" 
                                  : centreAnalysis.status === "NEEDS_ATTENTION" 
                                    ? "border-amber-200/80 bg-amber-50/5" 
                                    : "border-gray-200/60"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-[10px] text-gray-400 font-semibold uppercase">{centre.district} District</div>
                                  <h5 className="font-bold text-sm text-gray-900">{centre.name}</h5>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(centreAnalysis.status)}`}>
                                  {centreAnalysis.status}
                                </span>
                              </div>

                              {/* Indicators summary */}
                              <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-100 py-3">
                                <div className="space-y-0.5">
                                  <span className="text-gray-400 font-medium text-[10px] block">Bed Occupancy</span>
                                  <span className={`font-mono font-bold ${getBedsAvailablePercent(centre) < 10 ? "text-rose-600" : getBedsAvailablePercent(centre) < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {centre.beds.available} / {centre.beds.total} Available ({getBedsAvailablePercent(centre).toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-gray-400 font-medium text-[10px] block">Doctor Presence</span>
                                  <span className={`font-mono font-bold ${getDoctorAttendancePercent(centre) < 60 ? "text-rose-600" : getDoctorAttendancePercent(centre) < 80 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {centre.doctors.present} / {centre.doctors.total} Present ({getDoctorAttendancePercent(centre).toFixed(0)}%)
                                  </span>
                                </div>
                              </div>

                              {/* Issues counter */}
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-medium">Active Violations:</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                  centreAnalysis.issues.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {centreAnalysis.issues.length}
                                </span>
                              </div>

                              {/* Short Action-Oriented AI summary */}
                              <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded leading-relaxed border border-gray-100/50">
                                {centreAnalysis.summary}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recurring District Priorities */}
                    <div className="bg-indigo-900 text-white p-6 rounded-2xl space-y-4">
                      <h4 className="font-bold text-sm text-indigo-200 flex items-center gap-1.5 border-b border-indigo-800 pb-2">
                        <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        Administrative Priority & Recurring Cross-Centre Audits
                      </h4>
                      <p className="text-xs text-indigo-200 max-w-2xl">
                        Deterministic priority flag: If a critical failure is identified in <strong>2 or more blocks</strong>, it is elevated as a systemic administrative action order.
                      </p>

                      {analysisResult.districtSummary.recurringIssues.length === 0 ? (
                        <div className="text-xs font-semibold text-emerald-300 bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/40">
                          ✓ No recurring critical infrastructure bottlenecks detected across Haridwar block facilities. Keep up standard operations.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.districtSummary.recurringIssues.map((issue, idx) => (
                            <div key={idx} className="bg-indigo-950/60 border border-indigo-800 p-4 rounded-xl space-y-2">
                              <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-rose-500/40 tracking-wider">Recurring Violation Flag</span>
                              <div className="text-xs font-bold text-white mt-1">{issue}</div>
                              <p className="text-[10px] text-indigo-300 leading-relaxed pt-1 border-t border-indigo-800/60">
                                Systemic crisis detected. Requires coordinated block transfers, centralized logistics procurement, or executive task force assignment.
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Clinician Red-Flags Section for DM */}
                    <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="font-bold text-gray-950 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                          District-Wide Clinician Red-Flags ({doctorReports.length})
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono">Real-time Overrides from Field Medical Officers</span>
                      </div>

                      {doctorReports.length === 0 ? (
                        <div className="text-xs text-gray-500 italic p-2">No active clinician emergency red-flags filed in Haridwar district.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {doctorReports.map(rep => {
                            const matchedC = centres.find(c => c.id === rep.centreId);
                            return (
                              <div key={rep.id} className="bg-rose-50/20 border border-rose-100 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-gray-400">{matchedC ? matchedC.name : "PHC"}</span>
                                    <div className="text-xs font-bold text-rose-800">{rep.category}</div>
                                  </div>
                                  <span className="text-[9px] font-mono text-gray-400">{rep.date}</span>
                                </div>
                                <p className="text-xs text-gray-600 italic">"{rep.comment}"</p>
                                <div className="flex justify-between items-center pt-2 border-t border-rose-100/40">
                                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Action Order Pending</span>
                                  <button 
                                    id={`dm-ack-${rep.id}`}
                                    onClick={() => alert(`DM Directive dispatched to ${matchedC ? matchedC.name : "PHC"} medical officer to resolve immediately.`)}
                                    className="bg-white hover:bg-slate-50 text-[10px] font-bold py-1 px-2 border.5 rounded text-gray-700 shadow-xs transition-colors"
                                  >
                                    Dispatch Directive
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 4. MEMBER OF PARLIAMENT (MP) SCREEN */}
                {role === "mp" && analysisResult && (
                  <div id="screen-mp" className="space-y-8">
                    
                    {/* Header block */}
                    <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Member of Parliament (Lok Sabha Portal)
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">Constituency Executive Intelligence Report</h3>
                        <p className="text-xs text-gray-500 mt-1">Parliamentary supervision of primary health infrastructure and correction directives.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200/60 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        Parliamentary Oversight Active
                      </div>
                    </div>

                    {/* AI Report A: Updates and Status */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
                      <div className="bg-emerald-900 text-white p-5">
                        <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Report A: updates_and_status</div>
                        <h4 className="text-lg font-bold mt-1 tracking-tight">{analysisResult.mpUpdatesAndStatus.headline}</h4>
                        <p className="text-xs text-emerald-100 mt-2 leading-relaxed max-w-4xl">{analysisResult.mpUpdatesAndStatus.summary}</p>
                      </div>

                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/5">
                        
                        {/* Positive Updates list */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Positive Updates & Operational Milestones
                          </h5>
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {analysisResult.mpUpdatesAndStatus.positiveUpdates.map((item, idx) => (
                              <div key={idx} className="bg-emerald-50/40 border border-emerald-200/50 p-3 rounded-xl text-xs font-medium text-emerald-900 leading-relaxed">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Needing Monitoring list */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-100 pb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Facilities Needing Monitoring & Action
                          </h5>
                          <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 align-start content-start">
                            {analysisResult.mpUpdatesAndStatus.centresNeedingMonitoring.length === 0 ? (
                              <div className="w-full text-center text-xs text-gray-400 py-6 font-semibold">
                                All facilities operating in perfect alignment. Zero monitoring flags.
                              </div>
                            ) : (
                              analysisResult.mpUpdatesAndStatus.centresNeedingMonitoring.map((name, idx) => {
                                const matchedCentre = centres.find(c => c.name === name);
                                const status = analysisResult.healthCentreAnalysis.find(a => a.healthCentreName === name)?.status || "NEEDS_ATTENTION";
                                return (
                                  <div key={idx} className={`p-3 rounded-xl border flex-1 min-w-[200px] flex items-center justify-between text-xs font-bold ${getStatusBadgeClass(status)}`}>
                                    <div>{name}</div>
                                    <span className="text-[10px] font-black uppercase font-mono opacity-80">{status}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* AI Report B: Needs Correction */}
                    <div className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-sm border border-slate-800">
                      <div className="bg-slate-950 p-5 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Report B: needs_correction</div>
                          <h4 className="text-base font-black tracking-tight mt-0.5">Urgent Systemic Interventions Required</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overall Constituency Urgency:</span>
                          <span className={`px-3 py-1 rounded text-xs font-black border ${
                            analysisResult.mpNeedsCorrection.overallUrgency === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}>
                            {analysisResult.mpNeedsCorrection.overallUrgency}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {analysisResult.mpNeedsCorrection.issues.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                            ✓ No constituency correction orders required. All operational thresholds are fully intact.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {analysisResult.mpNeedsCorrection.issues.map((issue, idx) => (
                              <div key={idx} className="bg-slate-800/45 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between space-y-3.5">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                                    <span className="text-xs font-black text-rose-400">Bottleneck #{idx + 1}</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">Affected Facilities: {issue.affectedHealthCentres.join(", ") || "None"}</span>
                                  </div>
                                  <div className="text-sm font-bold text-slate-200">{issue.problem}</div>
                                  <div className="text-xs text-slate-300 pt-1 leading-relaxed">
                                    <span className="text-orange-300 font-extrabold uppercase text-[9px] block mb-0.5">Public Health Impact:</span>
                                    {issue.impact}
                                  </div>
                                </div>
                                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40 text-xs italic text-slate-300 leading-relaxed">
                                  <span className="text-emerald-400 font-extrabold uppercase text-[9px] not-italic block mb-0.5">MP Recommendation & Funding Priority:</span>
                                  "{issue.recommendedGovernmentAction}"
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* FOOTER */}
      <footer id="dashboard-footer" className="bg-white border-t border-gray-100 mt-20 py-8 px-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Ministry of Health & Family Welfare, Government of India. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Designed for Digital India Infrastructure Program</span>
          </div>
        </div>
      </footer>

      {/* DRAWER 1: DATA JSON EDITOR */}
      {showJsonEditor && (
        <div id="json-editor-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-700" />
                  Health Infrastructure Inventory Editor
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Directly edit the raw JSON model of block health centres in the district.</p>
              </div>
              <button 
                id="btn-close-editor"
                onClick={() => setShowJsonEditor(false)}
                className="text-gray-400 hover:text-gray-900 font-bold text-xl p-2"
              >
                ×
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Health Centres JSON Data Array:</label>
                <textarea 
                  id="json-textarea"
                  value={rawJsonInput}
                  onChange={(e) => setRawJsonInput(e.target.value)}
                  className="w-full flex-1 p-4 font-mono text-xs bg-slate-900 text-slate-100 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {jsonError && (
                <div id="json-error" className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3.5 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button 
                id="btn-reset-editor"
                onClick={handleResetData}
                className="text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-bold"
              >
                Reset Default
              </button>
              <div className="flex gap-2">
                <button 
                  id="btn-cancel-editor"
                  onClick={() => setShowJsonEditor(false)}
                  className="text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button 
                  id="btn-apply-editor"
                  onClick={handleApplyJson}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg"
                >
                  Apply & Run Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 2: JSON RAW OUTPUT (SCHEMA MATCH) */}
      {showOutputDrawer && (
        <div id="output-drawer-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-slate-950 w-full max-w-3xl h-full flex flex-col shadow-2xl text-white">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-400" />
                  Calculated Output JSON
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Exposes the exact, pristine compliance JSON schema matching the system requirements.</p>
              </div>
              <button 
                id="btn-close-output"
                onClick={() => setShowOutputDrawer(false)}
                className="text-slate-400 hover:text-white font-bold text-xl p-2"
              >
                ×
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs select-all text-slate-200 leading-relaxed relative">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  id="btn-copy-output"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedText ? "Copied!" : "Copy Scheme JSON"}
                </button>
              </div>
              <pre id="raw-json-output" className="whitespace-pre-wrap">{JSON.stringify(analysisResult, null, 2)}</pre>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 text-right">
              <button 
                id="btn-dismiss-output"
                onClick={() => setShowOutputDrawer(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg border border-slate-700"
              >
                Dismiss View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
