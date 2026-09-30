(() => {
  "use strict";

  const PRIORITY_GROUPS = {
    P0: { id: "P0", label: "TOP", watermarkLabel: "FOCUS HERE" },
    P1: { id: "P1", label: "HIGH", watermarkLabel: "PRIORITIZE" },
    P2: { id: "P2", label: "MEDIUM", watermarkLabel: "APPLY NORMALLY" },
    P3: { id: "P3", label: "SKIP", watermarkLabel: "SKIP" }
  };

  /*
   * overallPercentage:
   * observed application -> initial HUMAN interview conversion %
   *
   * Example:
   *   2.76 = 2.76%
   *
   * null = insufficient / unstable sample
   *
   * IMPORTANT:
   * priority is controlled ONLY by `group`.
   * overallPercentage is display / future-analysis metadata.
   */
  const ATS_RULES = [

    // =========================================================
    // P0 — FOCUS
    // =========================================================

    {
      name: "Paylocity",
      group: "P0",
      overallPercentage: 3.89,
      matches: [
        "recruiting.paylocity.com",
        "paylocity.com/recruiting"
      ]
    },

    {
      name: "iCIMS",
      group: "P0",
      overallPercentage: 3.81,
      matches: [
        "icims.com"
      ]
    },

    {
      name: "Workday",
      group: "P0",
      overallPercentage: 2.76,
      matches: [
        "myworkdayjobs.com",
        "myworkdaysite.com"
      ]
    },

    {
      name: "Rippling",
      group: "P0",
      overallPercentage: 2.33,
      matches: [
        "ats.rippling.com",
        "rippling-ats.com"
      ]
    },


    // =========================================================
    // P1 — PRIORITIZE
    // =========================================================

    {
      name: "JobScore",
      group: "P1",
      overallPercentage: 3.88,
      matches: [
        "jobscore.com"
      ]
    },

    {
      name: "Comeet",
      group: "P1",
      overallPercentage: 2.67,
      matches: [
        "comeet.com"
      ]
    },

    {
      name: "ClearCompany",
      group: "P1",
      overallPercentage: 2.52,
      matches: [
        "clearcompany.com"
      ]
    },

    {
      name: "Paycom",
      group: "P1",
      overallPercentage: 2.03,
      matches: [
        "paycomonline.net"
      ]
    },

    {
      name: "Lever",
      group: "P1",
      overallPercentage: 1.39,
      matches: [
        "jobs.lever.co",
        "jobs.eu.lever.co",
        "schedule.lever.co"
      ]
    },

    {
      name: "Workable",
      group: "P1",
      overallPercentage: 1.38,
      matches: [
        "apply.workable.com",
        "jobs.workable.com"
      ]
    },

    {
      name: "BambooHR",
      group: "P1",
      overallPercentage: 1.35,
      matches: [
        "bamboohr.com"
      ]
    },

    {
      name: "JazzHR",
      group: "P1",
      overallPercentage: 1.34,
      matches: [
        "applytojob.com",
        "app.jazz.co"
      ]
    },

    {
      name: "Greenhouse",
      group: "P1",
      overallPercentage: 1.15,
      matches: [
        "greenhouse.io"
      ]
    },

    {
      name: "Ashby",
      group: "P1",
      overallPercentage: 1.11,
      matches: [
        "ashbyhq.com"
      ]
    },


    // =========================================================
    // P2 — NORMAL / INSUFFICIENT EVIDENCE
    // =========================================================

    {
      name: "PageUp",
      group: "P2",
      overallPercentage: 7.27,
      matches: [
        "pageuppeople.com"
      ]
    },

    {
      name: "TTC Portals",
      group: "P2",
      overallPercentage: 6.25,
      matches: [
        "ttcportals.com/jobs/"
      ]
    },

    {
      name: "Betterteam",
      group: "P2",
      overallPercentage: 9.52,
      matches: [
        "betterteam.com"
      ]
    },

    {
      name: "Scalis",
      group: "P2",
      overallPercentage: 6.45,
      matches: [
        "scalis.ai"
      ]
    },

    {
      name: "HireBridge",
      group: "P2",
      overallPercentage: 3.70,
      matches: [
        "hirebridge.com"
      ]
    },

    {
      name: "Eightfold",
      group: "P2",
      overallPercentage: 2.56,
      matches: [
        "eightfold.ai/careers"
      ]
    },

    {
      name: "SmartSearch",
      group: "P2",
      overallPercentage: 2.56,
      matches: [
        "smartsearchonline.com"
      ]
    },

    {
      name: "iSolved Hire",
      group: "P2",
      overallPercentage: 2.27,
      matches: [
        "isolvedhire.com"
      ]
    },

    {
      name: "Jobvite",
      group: "P2",
      overallPercentage: 1.14,
      matches: [
        "jobvite.com"
      ]
    },

    {
      name: "SmartRecruiters",
      group: "P2",
      overallPercentage: 0.97,
      matches: [
        "smartrecruiters.com"
      ]
    },

    {
      name: "BreezyHR",
      group: "P2",
      overallPercentage: 0.89,
      matches: [
        "breezy.hr"
      ]
    },

    {
      name: "Dayforce",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.dayforcehcm.com",
        "jobs.dayforce.com"
      ]
    },

    {
      name: "Avature",
      group: "P2",
      overallPercentage: null,
      matches: [
        "avature.net"
      ]
    },

    {
      name: "HiBob",
      group: "P2",
      overallPercentage: null,
      matches: [
        "careers.hibob.com"
      ]
    },

    {
      name: "Gupy",
      group: "P2",
      overallPercentage: null,
      matches: [
        "gupy.io"
      ]
    },

    {
      name: "Factorial",
      group: "P2",
      overallPercentage: null,
      matches: [
        "factorialhr.com"
      ]
    },

    {
      name: "Gem",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.gem.com"
      ]
    },

    {
      name: "ApplicantStack",
      group: "P2",
      overallPercentage: null,
      matches: [
        "applicantstack.com"
      ]
    },

    {
      name: "HireAtomic",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.hireatomic.com"
      ]
    },

    {
      name: "Recruitee",
      group: "P2",
      overallPercentage: null,
      matches: [
        "recruitee.com"
      ]
    },

    {
      name: "Teamtailor",
      group: "P2",
      overallPercentage: null,
      matches: [
        "teamtailor.com"
      ]
    },

    {
      name: "Paycor Recruiting",
      group: "P2",
      overallPercentage: null,
      matches: [
        "recruitingbypaycor.com"
      ]
    },

    {
      name: "BrassRing",
      group: "P2",
      overallPercentage: null,
      matches: [
        "brassring.com"
      ]
    },

    {
      name: "TriNet Hire",
      group: "P2",
      overallPercentage: null,
      matches: [
        "app.trinethire.com"
      ]
    },

    {
      name: "RippleHire",
      group: "P2",
      overallPercentage: null,
      matches: [
        "ripplehire.com"
      ]
    },

    {
      name: "NEOGOV",
      group: "P2",
      overallPercentage: null,
      matches: [
        "governmentjobs.com/careers/",
        "governmentjobs.com/jobs/"
      ]
    },

    {
      name: "CareerPlug",
      group: "P2",
      overallPercentage: null,
      matches: [
        "careerplug.com"
      ]
    },

    {
      name: "Freshteam",
      group: "P2",
      overallPercentage: null,
      matches: [
        "freshteam.com"
      ]
    },

    {
      name: "Trakstar Hire",
      group: "P2",
      overallPercentage: null,
      matches: [
        "hire.trakstar.com"
      ]
    },

    {
      name: "Crelate",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.crelate.com"
      ]
    },

    {
      name: "JobAdder",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobadder.com"
      ]
    },

    {
      name: "Fountain",
      group: "P2",
      overallPercentage: null,
      matches: [
        "fountain.com/apply/",
        "web.fountain.com/apply/"
      ]
    },

    {
      name: "Loxo",
      group: "P2",
      overallPercentage: null,
      matches: [
        "app.loxo.co/job/"
      ]
    },

    {
      name: "SilkRoad",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.silkroad.com"
      ]
    },

    {
      name: "Homerun",
      group: "P2",
      overallPercentage: null,
      matches: [
        "homerun.co"
      ]
    },

    {
      name: "Jobsoid",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobsoid.com"
      ]
    },

    {
      name: "Quickin",
      group: "P2",
      overallPercentage: null,
      matches: [
        "jobs.quickin.io"
      ]
    },

    {
      name: "ApplicantPool",
      group: "P2",
      overallPercentage: null,
      matches: [
        "applicantpool.com"
      ]
    },

    {
      name: "TeamWork Online",
      group: "P2",
      overallPercentage: null,
      matches: [
        "teamworkonline.com"
      ]
    },

    {
      name: "PeopleForce",
      group: "P2",
      overallPercentage: null,
      matches: [
        "peopleforce.io/careers/"
      ]
    },

    {
      name: "Wellfound",
      group: "P2",
      overallPercentage: null,
      matches: [
        "wellfound.com/jobs/"
      ]
    },

    {
      name: "Avionté",
      group: "P2",
      overallPercentage: null,
      matches: [
        "hire.myavionte.com/app/careers/"
      ]
    },


    // =========================================================
    // P3 — SKIP
    // =========================================================

    {
      name: "JobDiva",
      group: "P3",
      overallPercentage: 0.11,
      matches: [
        "jobdiva.com/portal/"
      ]
    },

    {
      name: "Oracle Taleo",
      group: "P3",
      overallPercentage: 0.64,
      matches: [
        "taleo.net"
      ]
    },

    {
      name: "Oracle Recruiting",
      group: "P3",
      overallPercentage: 0.64,
      matches: [
        "oraclecloud.com/hcmui/candidateexperience"
      ]
    },

    {
      name: "UKG / UltiPro",
      group: "P3",
      overallPercentage: 0.62,
      matches: [
        "ultipro.com"
      ]
    },

    {
      name: "Pinpoint",
      group: "P3",
      overallPercentage: 0.62,
      matches: [
        "pinpointhq.com"
      ]
    },

    {
      name: "Gusto",
      group: "P3",
      overallPercentage: 0.61,
      matches: [
        "jobs.gusto.com"
      ]
    },

    {
      name: "Zoho Recruit",
      group: "P3",
      overallPercentage: 0.59,
      matches: [
        "zohorecruit.com",
        "zohorecruit.in",
        "zohorecruit.eu"
      ]
    },

    {
      name: "JOIN",
      group: "P3",
      overallPercentage: 0.43,
      matches: [
        "join.com/companies/"
      ]
    },

    {
      name: "ADP",
      group: "P3",
      overallPercentage: 0.20,
      matches: [
        "workforcenow.adp.com",
        "myjobs.adp.com",
        "recruiting.adp.com"
      ]
    },

    {
      name: "Manatal",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "careers-page.com"
      ]
    },

    {
      name: "YC Work at a Startup",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "ycombinator.com/companies/",
        "workatastartup.com/jobs/"
      ]
    },

    {
      name: "SAP SuccessFactors",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "successfactors.com",
        "successfactors.eu",
        "sapsf.com",
        "jobs.hr.cloud.sap"
      ]
    },

    {
      name: "Jibe Apply",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "jibeapply.com"
      ]
    },

    {
      name: "JobCopilot",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "jobs.jobcopilot.com"
      ]
    },

    {
      name: "CareerPuck",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "careerpuck.com/job-board/"
      ]
    },

    {
      name: "HiringThing",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "hiringthing.com"
      ]
    },

    {
      name: "Cornerstone / CSOD",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "csod.com/ux/ats/"
      ]
    },

    {
      name: "Dover",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "app.dover.com"
      ]
    },

    {
      name: "Recruiterflow",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "recruiterflow.com"
      ]
    },

    {
      name: "CATS",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "catsone.com"
      ]
    },

    {
      name: "Keka",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "keka.com/careers"
      ]
    },

    {
      name: "Kula",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "careers.kula.ai"
      ]
    },

    {
      name: "ApplicantPro",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "applicantpro.com"
      ]
    },

    {
      name: "Hiresome",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "hiresome.ai"
      ]
    },

    {
      name: "Personio",
      group: "P3",
      overallPercentage: 0.00,
      matches: [
        "jobs.personio."
      ]
    }
  ];


  /*
   * Direct company-hosted application fallback.
   *
   * Checked ONLY after every known ATS / career platform.
   */
  const DIRECT_RULE = {
    name: "Direct",
    group: "P2",
    overallPercentage: 1.10,

    matches: [
      "careers.",
      "jobs.",
      "/careers/",
      "/career/",
      "/jobs/",
      "/job/",
      "/apply/",
      "/application/",
      "/applications/",
      "/opportunities/"
    ],

    excludes: [
      "linkedin.com",
      "indeed.com",
      "glassdoor.com",
      "ziprecruiter.com",

      "jobright.ai",
      "hiring.cafe",
      "remoterocketship.com",
      "builtin.com",

      "ycombinator.com",
      "workatastartup.com",
      "wellfound.com"
    ]
  };


  function classifyATS(url) {
    if (!url || typeof url !== "string") return null;

    const normalizedUrl = url.toLowerCase();

    /*
     * Known ATS / hosted recruiting platforms first.
     */
    for (const ats of ATS_RULES) {
      const matchedString = ats.matches.find(match =>
        normalizedUrl.includes(match.toLowerCase())
      );

      if (!matchedString) continue;

      return {
        name: ats.name,
        group: ats.group,
        matchedString,
        priority: PRIORITY_GROUPS[ats.group],
        type: "ats",
        overallPercentage: ats.overallPercentage
      };
    }

    /*
     * Direct employer-hosted career/application fallback.
     */
    const excluded = DIRECT_RULE.excludes.some(match =>
      normalizedUrl.includes(match)
    );

    if (!excluded) {
      const matchedString = DIRECT_RULE.matches.find(match =>
        normalizedUrl.includes(match)
      );

      if (matchedString) {
        return {
          name: DIRECT_RULE.name,
          group: DIRECT_RULE.group,
          matchedString,
          priority: PRIORITY_GROUPS[DIRECT_RULE.group],
          type: "direct",
          overallPercentage: DIRECT_RULE.overallPercentage
        };
      }
    }

    return null;
  }


  globalThis.ATS_PRIORITY = Object.freeze({
    groups: PRIORITY_GROUPS,
    rules: ATS_RULES,
    directRule: DIRECT_RULE,
    classify: classifyATS
  });

})();