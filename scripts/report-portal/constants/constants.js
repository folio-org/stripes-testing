let TEAM_RESPONSIBLE_ONES = {};
try {
  // eslint-disable-next-line global-require, import/extensions
  TEAM_RESPONSIBLE_ONES = require('../team-responsible-ones/team-responsible-ones');
} catch (e) {
  // team-responsible-ones.js is gitignored and optional
}

const TEAM_NAMES = {
  ATHENA: 'Athena',
  EUREKA: 'Eureka',
  PROMIN: 'Promin',
  THUNDERJET: 'Thunderjet',
  VEGA: 'Vega',
  HELIOS: 'Helios',
};

const TEAMS = [
  { name: TEAM_NAMES.ATHENA, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.ATHENA] || '' },
  { name: TEAM_NAMES.EUREKA, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.EUREKA] || '' },
  { name: TEAM_NAMES.PROMIN, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.PROMIN] || '' },
  { name: TEAM_NAMES.THUNDERJET, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.THUNDERJET] || '' },
  { name: TEAM_NAMES.VEGA, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.VEGA] || '' },
  { name: TEAM_NAMES.HELIOS, responsible: TEAM_RESPONSIBLE_ONES[TEAM_NAMES.HELIOS] || '' },
];

module.exports = {
  LAUNCHES: {
    NIGHTLY: 'runNightlyCypressEurekaTests',
    QG: 'folioQualityGates',
  },
  SPEC_TYPES: {
    SUITE: 'SUITE',
    STEP: 'STEP',
  },
  REPORT_LAUNCHES: [
    'folioQualityGates',
    'runNightlyCypressEurekaTests',
    'runNightlyCypressEurekaTestsECS',
    'runNightlyEurekaReleaseTests-non-ecs',
    'runNightlyEurekaReleaseTests-ecs',
  ],
  TEAMS,
  GREETING: ['Good day, team.', 'We have several test results to be analysed across our runs:'],
  CONCLUSION: ['', 'Thank you.'],
  RP_UI_BASE_URL: 'https://report-portal.ci.folio.org/ui/#cypress-nightly/launches/all',
  RP_TO_INVESTIGATE_PARAMS:
    'item0Params=filter.eq.hasStats%3Dtrue%26filter.eq.hasChildren%3Dfalse%26filter.in.type%3DSTEP%26filter.in.status%3DFAILED%252CINTERRUPTED%26filter.in.issueType%3Dti001',
};
