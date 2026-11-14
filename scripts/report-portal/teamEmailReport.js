/* eslint-disable no-console */
const { getLatestLaunch } = require('./services/launchService');
const { getToInvestigateCount } = require('./services/itemService');
const {
  REPORT_LAUNCHES,
  TEAMS,
  TEAM_NAMES,
  TEAM_EMAILS,
  RP_UI_BASE_URL,
  RP_TO_INVESTIGATE_PARAMS,
} = require('./constants/constants');

const EMAIL_CONTENT = {
  subject: (teamName) => `[Info] Daily automated test status updates - ${teamName} team`,
  greeting: (teamName) => `Good day, ${teamName} team.`,
  intro:
    'We would like to share the daily status update for our automated test runs. Below is a summary of the latest results that might require your attention or review:',
  outro: 'Please feel free to check the links above for more detailed insights. ',
  signoff: 'Thank you for your time and efforts.',
};

function buildEmailBody(teamName, runs) {
  const lines = [EMAIL_CONTENT.greeting(teamName), '', EMAIL_CONTENT.intro, ''];

  for (const run of runs) {
    lines.push(`• ${run.label}: ${run.count} tests "To Investigate"`);
    lines.push(`  ${run.url}`);
    lines.push('');
  }

  lines.push(EMAIL_CONTENT.outro);
  lines.push('');
  lines.push(EMAIL_CONTENT.signoff);

  return lines.join('\n');
}

function buildMailtoLink(teamName, subject, body) {
  const { to = '', cc = '' } = TEAM_EMAILS[teamName] || {};
  // encodeURIComponent encodes \n as %0A; replace with %0D%0A for email clients
  const encode = (str) => encodeURIComponent(str).replace(/%0A/g, '%0D%0A');
  const ccPart = cc ? `&cc=${encode(cc)}` : '';

  return `mailto:${to}?subject=${encode(subject)}${ccPart}&body=${encode(body)}`;
}

function printTeamEmail(teamName, allRunData) {
  const teamRuns = allRunData
    .filter((run) => {
      const teamEntry = run.teamCounts.find((t) => t.name === teamName);
      return teamEntry && teamEntry.count > 0;
    })
    .map((run) => ({
      label: `${run.launchName} #${run.number}`,
      count: run.teamCounts.find((t) => t.name === teamName).count,
      url: run.url.replace(
        '%26filter.in.issueType%3Dti001',
        `%26filter.cnt.name%3D${teamName.toLowerCase()}%26page.page%3D1%26filter.in.issueType%3Dti001`,
      ),
    }));

  console.log(`\n============================== ${teamName} ==============================\n`);

  if (teamRuns.length === 0) {
    console.log('No failed tests to report.');
    return;
  }

  const subject = EMAIL_CONTENT.subject(teamName);
  const body = buildEmailBody(teamName, teamRuns);
  const mailto = buildMailtoLink(teamName, subject, body);

  console.log(`Subject: ${subject}`);
  console.log('\nBody:');
  console.log(body);
  console.log('\nMailto link:');
  console.log(mailto);
  console.log('\n\n\n\n\n');
}

/**
 * Parse command line arguments
 * Supports: --team value
 */
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1];
      i++;
    }
  }

  return args;
}

async function main() {
  const { team: targetTeam } = parseArgs();

  const allTeams = Object.values(TEAM_NAMES);

  if (targetTeam && !allTeams.includes(targetTeam)) {
    console.error(`✗ Unknown team: "${targetTeam}". Available teams: ${allTeams.join(', ')}`);
    process.exit(1);
  }

  const allRunData = [];

  for (const launchName of REPORT_LAUNCHES) {
    const launch = await getLatestLaunch({ name: launchName });

    if (launch) {
      const teamCounts = await Promise.all(
        TEAMS.map(async (team) => {
          const count = await getToInvestigateCount({ launchId: launch.id, team: team.name });
          return { name: team.name, count };
        }),
      );

      const total = teamCounts.reduce((sum, t) => sum + t.count, 0);

      if (total) {
        const url = `${RP_UI_BASE_URL}/${launch.id}?${RP_TO_INVESTIGATE_PARAMS}`;
        allRunData.push({ launchName, number: launch.number, teamCounts, url });
      }
    }
  }

  const teamsToProcess = targetTeam ? [targetTeam] : allTeams;

  for (const teamName of teamsToProcess) {
    printTeamEmail(teamName, allRunData);
  }
}

main().catch((err) => {
  console.error(`\n✗ Error: ${err.message}`);
  process.exit(1);
});
