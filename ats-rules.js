(() => {
  "use strict";

  /*
   * Priority groups
   *
   * P0 = strongest focus
   * P1 = prioritize
   * P2 = normal
   * P3 = skip by default
   */

  const PRIORITY_GROUPS = {
    P0: {
      id: "P0",
      label: "TOP",
      watermarkLabel: "FOCUS HERE"
    },
  
    P1: {
      id: "P1",
      label: "HIGH",
      watermarkLabel: "PRIORITIZE"
    },
  
    P2: {
      id: "P2",
      label: "MEDIUM",
      watermarkLabel: "APPLY NORMALLY"
    },
  
    P3: {
      id: "P3",
      label: "SKIP",
      watermarkLabel: "SKIP"
    }
  };


  /*
   * ATS detection rules
   *
   * Keep the shortest sufficiently unique string possible.
   *
   * More specific rules should appear BEFORE broader rules
   * if two patterns could ever overlap.
   */

  const ATS_RULES = [

    // =========================================================
    // P0 — FOCUS HERE
    // =========================================================

    {
      name: "Paylocity",
      group: "P0",
      matches: [
        "paylocity.com"
      ]
    },

    {
      name: "iCIMS",
      group: "P0",
      matches: [
        "icims.com"
      ]
    },

    {
      name: "Workday",
      group: "P0",
      matches: [
        "myworkdayjobs.com"
      ]
    },

    {
      name: "Rippling",
      group: "P0",
      matches: [
        "ats.rippling.com"
      ]
    },


    // =========================================================
    // P1 — PRIORITIZE
    // =========================================================

    {
      name: "JobScore",
      group: "P1",
      matches: [
        "jobscore.com"
      ]
    },

    {
      name: "Comeet",
      group: "P1",
      matches: [
        "comeet.com"
      ]
    },

    {
      name: "ClearCompany",
      group: "P1",
      matches: [
        "clearcompany.com"
      ]
    },

    {
      name: "Paycom",
      group: "P1",
      matches: [
        "paycomonline.net"
      ]
    },

    {
      name: "Lever",
      group: "P1",
      matches: [
        "lever.co"
      ]
    },

    {
      name: "Workable",
      group: "P1",
      matches: [
        "workable.com"
      ]
    },

    {
      name: "BambooHR",
      group: "P1",
      matches: [
        "bamboohr.com"
      ]
    },

    {
      name: "JazzHR",
      group: "P1",
      matches: [
        "applytojob.com"
      ]
    },

    {
      name: "Greenhouse",
      group: "P1",
      matches: [
        "greenhouse.io"
      ]
    },

    {
      name: "Ashby",
      group: "P1",
      matches: [
        "ashbyhq.com"
      ]
    },


    // =========================================================
    // P2 — NORMAL
    // =========================================================

    {
      name: "Jobvite",
      group: "P2",
      matches: [
        "jobvite.com"
      ]
    },

    {
      name: "SmartRecruiters",
      group: "P2",
      matches: [
        "smartrecruiters.com"
      ]
    },

    {
      name: "BreezyHR",
      group: "P2",
      matches: [
        "breezy.hr"
      ]
    },

    {
      name: "PageUp",
      group: "P2",
      matches: [
        "pageuppeople.com"
      ]
    },

    {
      name: "Eightfold",
      group: "P2",
      matches: [
        "eightfold.ai"
      ]
    },

    {
      name: "HireBridge",
      group: "P2",
      matches: [
        "hirebridge.com"
      ]
    },

    {
      name: "SmartSearch",
      group: "P2",
      matches: [
        "smartsearchonline.com"
      ]
    },

    {
      name: "Betterteam",
      group: "P2",
      matches: [
        "betterteam.com"
      ]
    },

    {
      name: "Scalis",
      group: "P2",
      matches: [
        "scalis.ai"
      ]
    },


    // =========================================================
    // P3 — SKIP
    // =========================================================

    {
      name: "Oracle Taleo",
      group: "P3",
      matches: [
        "taleo.net"
      ]
    },

    /*
     * oraclecloud.com itself is NOT unique to recruiting,
     * so retain the recruiting-specific URL path.
     */
    {
      name: "Oracle Recruiting",
      group: "P3",
      matches: [
        "oraclecloud.com/hcmui/candidateexperience"
      ]
    },

    {
      name: "UKG / UltiPro",
      group: "P3",
      matches: [
        "ultipro.com"
      ]
    },

    {
      name: "Pinpoint",
      group: "P3",
      matches: [
        "pinpointhq.com"
      ]
    },

    /*
     * These use somewhat broader company domains.
     * Keep the application-specific strings when possible.
     */

    {
      name: "Gusto",
      group: "P3",
      matches: [
        "jobs.gusto.com"
      ]
    },

    {
      name: "Zoho Recruit",
      group: "P3",
      matches: [
        "zohorecruit.com"
      ]
    },

    {
      name: "JOIN",
      group: "P3",
      matches: [
        "join.com/companies/"
      ]
    },

    {
      name: "ADP",
      group: "P3",
      matches: [
        "workforcenow.adp.com",
        "myjobs.adp.com",
        "recruiting.adp.com"
      ]
    },

    {
      name: "Dover",
      group: "P3",
      matches: [
        "app.dover.com"
      ]
    },

    {
      name: "Recruiterflow",
      group: "P3",
      matches: [
        "recruiterflow.com"
      ]
    },

    {
      name: "CATS",
      group: "P3",
      matches: [
        "catsone.com"
      ]
    },

    {
      name: "Keka",
      group: "P3",
      matches: [
        "keka.com"
      ]
    },
    
    {
      name: "Personio",
      group: "P3",
      matches: [
        "jobs.personio."
      ]
    }
  ];


  /**
   * Classify a URL.
   *
   * @param {string} url
   * @returns {object|null}
   */
  function classifyATS(url) {
    if (!url || typeof url !== "string") {
      return null;
    }
  
    const normalizedUrl = url.toLowerCase();
  
    // 1. Known ATS gets first priority.
    for (const ats of ATS_RULES) {
      const matchedString = ats.matches.find(match =>
        normalizedUrl.includes(match.toLowerCase())
      );
  
      if (!matchedString) {
        continue;
      }
  
      return {
        name: ats.name,
        group: ats.group,
        matchedString,
        priority: PRIORITY_GROUPS[ats.group],
        type: "ats"
      };
    }
  
    // 2. Otherwise check for a direct company career page.
    const isExcluded = DIRECT_RULE.excludes.some(match =>
      normalizedUrl.includes(match)
    );
  
    if (!isExcluded) {
      const matchedString = DIRECT_RULE.matches.find(match =>
        normalizedUrl.includes(match)
      );
  
      if (matchedString) {
        return {
          name: DIRECT_RULE.name,
          group: DIRECT_RULE.group,
          matchedString,
          priority: PRIORITY_GROUPS[DIRECT_RULE.group],
          type: "direct"
        };
      }
    }
  
    // 3. Ordinary webpage.
    return null;
  }


  /*
   * Expose only one public object.
   */

  globalThis.ATS_PRIORITY = Object.freeze({
    groups: PRIORITY_GROUPS,
    rules: ATS_RULES,
    classify: classifyATS
  });

})();

const DIRECT_RULE = {
  name: "Direct",
  group: "P2",

  /*
   * These indicate that an otherwise-unrecognized URL
   * is probably a company career/application page.
   */
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

  /*
   * Don't accidentally classify job-search/source sites
   * as "Direct".
   */
  excludes: [
    "linkedin.com",
    "indeed.com",
    "glassdoor.com",
    "ziprecruiter.com",
    "jobright.ai",
    "hiring.cafe",
    "remoterocketship.com",
    "builtin.com"
  ]
};