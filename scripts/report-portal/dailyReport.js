/* eslint-disable no-console */
const { getLatestLaunch } = require('./services/launchService');
const { getToInvestigateCount } = require('./services/itemService');
const {
  REPORT_LAUNCHES,
  TEAMS,
  GREETING,
  CONCLUSION,
  RP_UI_BASE_URL,
  RP_TO_INVESTIGATE_PARAMS,
} = require('./constants/constants');

async function generateDailyReport() {
  const output = [GREETING[0], GREETING[1]];

  for (const launchName of REPORT_LAUNCHES) {
    const launch = await getLatestLaunch({ name: launchName });

    if (launch) {
      const teamCounts = await Promise.all(
        TEAMS.map(async (team) => {
          const count = await getToInvestigateCount({ launchId: launch.id, team: team.name });

          return { ...team, count };
        }),
      );

      const total = teamCounts.reduce((sum, team) => sum + team.count, 0);

      if (total) {
        const url = `${RP_UI_BASE_URL}/${launch.id}?${RP_TO_INVESTIGATE_PARAMS}`;

        output.push('');
        output.push(`${launchName} #${launch.number}: ${total} tests ${url}`);
        output.push('');
        teamCounts.forEach(({ name, responsible, count }) => {
          if (count) {
            const outputLine = responsible
              ? `${name} ${responsible} - ${count}`
              : `${name} - ${count}`;

            output.push(outputLine);
          }
        });
      }
    }
  }

  CONCLUSION.forEach((line) => output.push(line));

  console.log(output.join('\n'));
}

generateDailyReport().catch((err) => {
  console.error(`\n✗ Error: ${err.message}`);
  process.exit(1);
});
