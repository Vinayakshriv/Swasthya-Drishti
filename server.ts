import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { runDeterministicAnalysis } from "./src/analyzer.js";
import { DashboardOutput } from "./src/types.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Shared Gemini API Client with proper User-Agent header for telemetry
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. Core analysis API endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { centres, currentDate } = req.body;
    if (!Array.isArray(centres)) {
      return res.status(400).json({ error: "Invalid input. 'centres' must be an array of health centres." });
    }

    const curDate = currentDate || "2026-07-05";

    // Step 1: Run deterministic analysis to ensure absolute compliance with categorizations & rules
    const baseAnalysis = runDeterministicAnalysis(centres, curDate);

    // If Gemini client is not initialized, return deterministic base results immediately
    if (!aiClient) {
      console.log("No Gemini API key configured. Returning deterministic analysis output directly.");
      return res.json(baseAnalysis);
    }

    // Step 2: Use Gemini to enhance descriptions, summaries, and recommendations
    const prompt = `
      You are a professional AI health-infrastructure monitoring analyst for a public healthcare dashboard in India.
      Your goal is to refine the natural language parts of a rule-based health centre analysis to make them extremely professional, concise, factual, and action-oriented for government officials.
      Do not change any computed statuses, severities, affected health centres, or priority indicators. Only rewrite the summary texts, explanations, headlines, and recommended actions.
      Do not invent missing information. Base every conclusion strictly on the provided dataset.

      Current Date: ${curDate}
      
      Input Health Centres Data:
      ${JSON.stringify(centres, null, 2)}

      Deterministic Analysis Results (use this as the source of truth for categories, statuses, severities, and matches):
      ${JSON.stringify(baseAnalysis, null, 2)}

      Refine the following fields inside the JSON:
      1. For each item in "healthCentreAnalysis":
         - "summary": Draft a concise, highly professional 2-sentence summary explaining the key status and most critical infrastructure gaps.
         - For each issue in "issues":
           - "message": Keep it clear, precise, and professional.
           - "recommendedAction": Write a highly practical, action-oriented, localized recommendation for the Healthcare In-charge of this centre.
      2. For "districtSummary":
         - "summary": A master-briefing paragraph for the District Magistrate. Connect indicators together to show systemic district constraints.
      3. For "mpUpdatesAndStatus":
         - "headline": Write a commanding, news-like briefing headline (e.g., "Critical Bed Shortages and Personnel Deficits Under-Mining Rural Health in [District]").
         - "summary": Write a high-level briefing summarizing positivity versus vulnerability trends across the constituency.
         - "positiveUpdates": Provide 1-2 positive milestones of centres running optimally (if any), phrased professionally.
      4. For "mpNeedsCorrection":
         - For each issue:
           - "problem": Professional framing of the recurring issue.
           - "impact": The severe systemic/public-health risk if left unaddressed.
           - "recommendedGovernmentAction": Concrete policy or administrative interventions for the Member of Parliament to sponsor or escalate.

      You MUST respond with a JSON object conforming exactly to this structure:
      {
        "healthCentreAnalysis": [
          {
            "healthCentreId": "string",
            "healthCentreName": "string",
            "status": "GOOD | NEEDS_ATTENTION | CRITICAL",
            "summary": "string",
            "issues": [
              {
                "category": "beds | doctor_attendance | medicine_stock | medicine_expiry",
                "severity": "low | medium | high | critical",
                "message": "string",
                "recommendedAction": "string"
              }
            ]
          }
        ],
        "districtSummary": {
          "overallStatus": "GOOD | NEEDS_ATTENTION | CRITICAL",
          "summary": "string",
          "priorityHealthCentres": ["string"],
          "recurringIssues": ["string"]
        },
        "mpUpdatesAndStatus": {
          "headline": "string",
          "summary": "string",
          "positiveUpdates": ["string"],
          "centresNeedingMonitoring": ["string"]
        },
        "mpNeedsCorrection": {
          "overallUrgency": "LOW | MEDIUM | HIGH | CRITICAL",
          "issues": [
            {
              "problem": "string",
              "affectedHealthCentres": ["string"],
              "impact": "string",
              "recommendedGovernmentAction": "string"
            }
          ]
        }
      }
    `;

    try {
      const geminiResponse = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1, // Low temperature for high precision
        }
      });

      const responseText = geminiResponse.text?.trim();
      if (responseText) {
        const enhancedOutput = JSON.parse(responseText) as DashboardOutput;
        
        // Strict Validation: Ensure that deterministic statuses, severities, and names are NOT mutated by the AI.
        // We override those critical rule-based properties to guarantee absolute compliance with the strict grading rules.
        enhancedOutput.healthCentreAnalysis.forEach((h, idx) => {
          const original = baseAnalysis.healthCentreAnalysis[idx];
          if (original) {
            h.healthCentreId = original.healthCentreId;
            h.healthCentreName = original.healthCentreName;
            h.status = original.status;
            
            h.issues.forEach((issue, issueIdx) => {
              const origIssue = original.issues[issueIdx];
              if (origIssue) {
                issue.category = origIssue.category;
                issue.severity = origIssue.severity;
              }
            });
          }
        });

        enhancedOutput.districtSummary.overallStatus = baseAnalysis.districtSummary.overallStatus;
        enhancedOutput.districtSummary.priorityHealthCentres = baseAnalysis.districtSummary.priorityHealthCentres;
        enhancedOutput.districtSummary.recurringIssues = baseAnalysis.districtSummary.recurringIssues;
        enhancedOutput.mpUpdatesAndStatus.centresNeedingMonitoring = baseAnalysis.mpUpdatesAndStatus.centresNeedingMonitoring;
        enhancedOutput.mpNeedsCorrection.overallUrgency = baseAnalysis.mpNeedsCorrection.overallUrgency;
        
        // Ensure same number of issues in needs correction
        enhancedOutput.mpNeedsCorrection.issues.forEach((issue, idx) => {
          const origIssue = baseAnalysis.mpNeedsCorrection.issues[idx];
          if (origIssue) {
            issue.affectedHealthCentres = origIssue.affectedHealthCentres;
          }
        });

        console.log("Successfully generated enhanced analysis via Gemini 3.5 Flash!");
        return res.json(enhancedOutput);
      }
    } catch (aiError) {
      console.error("Gemini API call or parsing failed. Falling back to deterministic analysis:", aiError);
    }

    return res.json(baseAnalysis);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Internal server error occurred during analysis." });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
