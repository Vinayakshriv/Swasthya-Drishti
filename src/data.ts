import { HealthCentre } from "./types";

export const SAMPLE_HEALTH_CENTRES: HealthCentre[] = [
  {
    id: "hc-01",
    name: "Bahadarabad PHC",
    district: "Haridwar",
    constituency: "Haridwar Lok Sabha",
    beds: {
      total: 15,
      available: 6 // 40% - GOOD
    },
    doctors: {
      total: 5,
      present: 5 // 100% - GOOD
    },
    medicines: [
      {
        name: "Paracetamol 500mg",
        isEssential: true,
        stock: 1200,
        minStock: 200,
        expiryDate: "2027-04-12" // GOOD
      },
      {
        name: "Amoxicillin 250mg",
        isEssential: true,
        stock: 600,
        minStock: 100,
        expiryDate: "2026-11-20" // GOOD
      },
      {
        name: "Oral Rehydration Salts (ORS)",
        isEssential: true,
        stock: 350,
        minStock: 50,
        expiryDate: "2026-12-05" // GOOD
      }
    ]
  },
  {
    id: "hc-02",
    name: "Rishikesh PHC",
    district: "Haridwar",
    constituency: "Haridwar Lok Sabha",
    beds: {
      total: 20,
      available: 3 // 15% - NEEDS_ATTENTION (< 20%)
    },
    doctors: {
      total: 6,
      present: 4 // 66.7% - NEEDS_ATTENTION (< 80%)
    },
    medicines: [
      {
        name: "Paracetamol 500mg",
        isEssential: true,
        stock: 180, // NEEDS_ATTENTION (<= 200 minStock)
        minStock: 200,
        expiryDate: "2026-10-15"
      },
      {
        name: "Amoxicillin 250mg",
        isEssential: true,
        stock: 150,
        minStock: 50,
        expiryDate: "2026-07-25" // NEEDS_ATTENTION (expiring in 20 days since current date is 2026-07-05)
      }
    ]
  },
  {
    id: "hc-03",
    name: "Roorkee CHC",
    district: "Haridwar",
    constituency: "Haridwar Lok Sabha",
    beds: {
      total: 50,
      available: 4 // 8% - CRITICAL (< 10%)
    },
    doctors: {
      total: 12,
      present: 10 // 83.3% - GOOD
    },
    medicines: [
      {
        name: "Insulin Injection",
        isEssential: true, // Essential and stock is 0
        stock: 0, // CRITICAL
        minStock: 10,
        expiryDate: "2026-09-30"
      },
      {
        name: "Atorvastatin 10mg",
        isEssential: false,
        stock: 45,
        minStock: 50, // NEEDS_ATTENTION (<= 50)
        expiryDate: "2026-06-30" // CRITICAL (expired on June 30, before July 5)
      }
    ]
  },
  {
    id: "hc-04",
    name: "Laksar PHC",
    district: "Haridwar",
    constituency: "Haridwar Lok Sabha",
    beds: {
      total: 10,
      available: 1 // 10% - NEEDS_ATTENTION (strictly >= 10%, wait, < 10% is CRITICAL, 10% is NEEDS_ATTENTION)
    },
    doctors: {
      total: 4,
      present: 2 // 50% - CRITICAL (< 60%)
    },
    medicines: [
      {
        name: "Paracetamol 500mg",
        isEssential: true,
        stock: 300,
        minStock: 100,
        expiryDate: "2026-07-01" // CRITICAL (already expired!)
      },
      {
        name: "Amoxicillin 250mg",
        isEssential: true,
        stock: 120,
        minStock: 100,
        expiryDate: "2026-12-15"
      }
    ]
  },
  {
    id: "hc-05",
    name: "Haridwar District Hospital CHC",
    district: "Haridwar",
    constituency: "Haridwar Lok Sabha",
    beds: {
      total: 100,
      available: 7 // 7% - CRITICAL (< 10%)
    },
    doctors: {
      total: 25,
      present: 14 // 56% - CRITICAL (< 60%)
    },
    medicines: [
      {
        name: "Ibuprofen 400mg",
        isEssential: false,
        stock: 400,
        minStock: 200,
        expiryDate: "2026-08-01" // NEEDS_ATTENTION (expires within 30 days)
      },
      {
        name: "Antivenom Serum",
        isEssential: true, // Essential and stock is 0
        stock: 0, // CRITICAL
        minStock: 5,
        expiryDate: "2026-10-10"
      }
    ]
  }
];
