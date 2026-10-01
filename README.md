# Prioritizer

**Prioritizer** is a Chrome extension for organizing and prioritizing high-volume job application workflows.

It automatically detects Applicant Tracking System (ATS) and employer application pages, classifies them into priority tiers, displays application-to-interview conversion statistics, and organizes open application tabs through a dedicated Chrome side panel.

Instead of treating every application as equally valuable, Prioritizer uses historical application outcomes to help focus attention on application channels that have produced stronger results.

## Features

### ATS Detection

Prioritizer automatically recognizes application pages from a large collection of recruiting platforms, including:

- Workday
- Greenhouse
- Lever
- Ashby
- iCIMS
- Paylocity
- Rippling
- SmartRecruiters
- Teamtailor
- Recruitee
- Dayforce
- CareerPlug
- Fountain
- Gupy
- Oracle Recruiting
- SAP SuccessFactors
- ADP
- UKG / UltiPro
- and many others

Employer-hosted career pages that do not use a recognized ATS can also be detected as **Direct** applications.

### Data-Driven Prioritization

Detected application pages are assigned to one of four priority groups:

| Priority | Meaning |
|---|---|
| **P0 — TOP** | Highest-priority application channels |
| **P1 — HIGH** | Channels worth prioritizing |
| **P2 — MEDIUM** | Normal application priority |
| **P3 — SKIP** | Low-priority channels |

Priority groups are configured in `ats-rules.js`.

The extension can also display an `overallPercentage` for each ATS representing its observed:

**application → initial human interview conversion rate**

For example:

```js
{
  name: "Workday",
  group: "P0",
  overallPercentage: 2.76,
  matches: [
    "myworkdayjobs.com",
    "myworkdaysite.com"
  ]
}
```

Here, `2.76` represents an observed **2.76% conversion rate**.

The percentage is metadata and does not dynamically determine the priority group. Priority remains explicitly controlled by `group`.

### Chrome Side Panel

Prioritizer provides a compact side panel containing the detected application tabs.

The panel makes it possible to:

- See ATS/application tabs in one place
- View their priority
- View observed conversion percentages
- Jump directly to an application tab
- Sort application tabs
- Close application tabs
- Optionally close the associated job-source tab
- Quickly work through large batches of applications

### Source + Application Tab Pairing

Job-search workflows commonly produce tab pairs:

```text
Job listing / aggregator
        ↓
Employer application / ATS
```

Prioritizer tracks these relationships so an application can remain associated with the page that originally led to it.

This makes it possible to close both pages together after completing or rejecting an application.

### Automatic Application-Page Discovery

Prioritizer can detect external employer application destinations from supported job-discovery sites.

Current integrations include sites such as:

- HiringCafe
- Jobright
- Built In
- Remote Rocketship

When possible, the extension extracts the actual employer or ATS application URL rather than requiring the user to manually locate and open it.

### Application Watermark

Recognized application pages receive a lightweight on-page priority indicator.

Depending on the configured priority, the watermark can show labels such as:

```text
FOCUS HERE
PRIORITIZE
APPLY NORMALLY
SKIP
```

The watermark is draggable so it can be moved away from application forms or other page controls.

## How It Works

At a high level:

```text
Job source
    │
    ▼
Application URL discovered
    │
    ▼
ATS / direct application detected
    │
    ▼
URL matched against ats-rules.js
    │
    ▼
Priority + conversion metadata assigned
    │
    ├──► Side panel
    │
    ├──► Application watermark
    │
    └──► Tab management / pairing
```

Known ATS rules are evaluated before the generic Direct fallback so recognizable recruiting platforms are not incorrectly classified as employer-hosted application pages.

## Conversion Data

The conversion percentages used by this project are based on historical job-application outcomes.

The primary metric is:

```text
Initial human interviews
──────────────────────── × 100
Submitted applications
```

For example, if an ATS had 7 verified initial human interviews from 103 reconstructed applications:

```text
7 / 103 × 100 = 6.80%
```

The resulting rule would contain:

```js
overallPercentage: 6.80
```

### Important Statistical Note

These percentages are **observed historical conversion rates from the analyzed dataset**.

They are not:

- Universal ATS success rates
- Measurements of ATS quality
- Predictions that a particular application will receive an interview
- Claims that the ATS itself caused an interview or rejection
- Representative statistics for every applicant, company, industry, or time period

Many factors influence application outcomes, including candidate profile, role, employer, labor market, application source, timing, geography, and sample size.

A `0.00%` value means that no verified initial-human-interview conversion was observed in the reconstructed sample. It does **not** mean the true underlying probability of receiving an interview through that platform is zero.

Small samples should be interpreted especially cautiously.

## ATS Rule Structure

ATS detection is configured in `ats-rules.js`.

A typical rule looks like:

```js
{
  name: "Teamtailor",
  group: "P2",
  overallPercentage: 6.80,
  matches: [
    "teamtailor.com"
  ]
}
```

Each rule contains:

- `name` — display name
- `group` — P0, P1, P2, or P3
- `overallPercentage` — observed application-to-initial-human-interview conversion percentage
- `matches` — URL fragments identifying the platform

### Direct Applications

Employer-hosted application pages that do not match a known ATS can fall back to the Direct rule.

For example:

```js
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
  ]
};
```

Job aggregators and other known source sites are excluded from this fallback to prevent source pages from being incorrectly treated as application pages.

## Installation

Prioritizer is currently intended to be loaded as an unpacked Chrome extension.

1. Clone this repository:

```bash
git clone <repository-url>
```

2. Open Chrome and navigate to:

```text
chrome://extensions
```

3. Enable **Developer mode**.

4. Click **Load unpacked**.

5. Select the Prioritizer project directory.

6. Open the Prioritizer side panel and start opening application pages.

After modifying extension source files, reload the extension from `chrome://extensions`.

Changes to content scripts may also require refreshing already-open application tabs.

## Project Structure

The core extension is organized approximately as follows:

```text
Prioritizer/
├── manifest.json
├── background.js
├── content.js
├── ats-rules.js
├── sidepanel.html
├── sidepanel.js
├── sidepanel.css
├── watermark.css
└── ...
```

### `ats-rules.js`

Contains ATS detection patterns, priority assignments, and conversion-rate metadata.

### `background.js`

Handles extension-level behavior such as tab discovery, source/application relationships, application destination detection, tab sorting, and tab closing.

### `content.js`

Handles behavior injected into supported application pages, including the priority watermark.

### `sidepanel.js`

Controls the interactive Chrome side-panel application queue.

### `sidepanel.css`

Contains side-panel presentation and layout.

### `watermark.css`

Styles the priority overlay displayed on application pages.

## Privacy

Prioritizer runs locally as a browser extension.

If you fork or modify the project, review `manifest.json` and the source code to understand the permissions and browser data the extension can access.

Do not commit personal browser-history exports, email archives, calendars, application trackers, credentials, API keys, or other private datasets used during analysis.

## Development

After making changes:

1. Save the modified source files.
2. Open `chrome://extensions`.
3. Reload Prioritizer.
4. Refresh existing application tabs when content-script changes need to be applied.
5. Reopen the side panel if necessary.

For changes to ATS detection, edit `ats-rules.js`.

Example:

```js
{
  name: "Example ATS",
  group: "P2",
  overallPercentage: 1.25,
  matches: [
    "example-ats.com"
  ]
}
```

Keep URL matching patterns as specific as necessary to avoid false positives.

## Goals

Prioritizer is designed around a simple idea:

> When processing a large number of job opportunities, browser organization and historical outcome data should help decide where attention goes.

The project combines:

**ATS detection + application analytics + tab management + workflow automation**

into a single browser-based application queue.

## Disclaimer

Prioritizer is an experimental productivity and analytics project.

Historical conversion statistics describe observations from a specific dataset and should not be interpreted as guarantees, universal hiring statistics, or evidence that an ATS causes a particular hiring outcome.

Hiring decisions are made by employers and recruiting teams, not by the Applicant Tracking System alone.

## License

Add the license you want to use for this repository here.

For example, if you choose the MIT License:

```text
MIT License
```

See `LICENSE` for details.
