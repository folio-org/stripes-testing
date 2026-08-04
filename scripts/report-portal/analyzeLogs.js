/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

/**
 * Analyze runFailedTests logs and collect failure statistics per environment (log file).
 *
 * Usage (from stripes-testing):
 *   node scripts/report-portal/analyzeLogs.js
 *   node scripts/report-portal/analyzeLogs.js --dir logs
 *   node scripts/report-portal/analyzeLogs.js --failures   # also list failing test names
 */

function parseArgs() {
  const argv = process.argv.slice(2);
  const args = { dir: 'logs', showFailures: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir' && argv[i + 1]) args.dir = argv[++i];
    else if (argv[i] === '--failures') args.showFailures = true;
  }
  return args;
}

/**
 * Extract the last aggregate "Tests / Passing / Failing ..." block from a Cypress
 * "(Results)" box is per-spec; we sum across all spec result boxes for totals.
 */
function analyzeLog(content) {
  // Sum per-spec result boxes: "│ Tests: N │", "│ Passing: N │", etc.
  const sumField = (label) => {
    const re = new RegExp(`\\b${label}:\\s+(\\d+)`, 'g');
    let total = 0;
    let m = re.exec(content);
    while (m !== null) {
      total += parseInt(m[1], 10);
      m = re.exec(content);
    }
    return total;
  };

  const tests = sumField('Tests');
  const passing = sumField('Passing');
  const failing = sumField('Failing');
  const pending = sumField('Pending');
  const skipped = sumField('Skipped');

  // Report Portal fetch stats
  const foundMatch = content.match(/Found (\d+) failed test\(s\) to investigate/);
  const specsMatch = content.match(/Test files to rerun:\s*(\d+)\s*spec file/);
  const markedMatch = content.match(/marked (\d+) test\(s\) as flaky/);

  // Failing test names. Cypress prints a detailed failure list where each entry is:
  //   1) Lists
  //        Permissions
  //          C476846 Verify ... (corsair):
  //      CypressError: ...
  // The title is the line ending with ":" that immediately precedes the error type line.
  const failNames = [];
  const lines = content.split('\n');
  const errorLineRe = /^\s+(CypressError|AssertionError|TypeError|Error|Timed out)\b/;
  for (let i = 1; i < lines.length; i++) {
    if (errorLineRe.test(lines[i])) {
      // Look backwards for the nearest non-empty line ending with ":" (the test title)
      for (let j = i - 1; j >= 0 && i - j <= 6; j--) {
        const t = lines[j].trim();
        if (t) {
          if (t.endsWith(':')) {
            const title = t.replace(/:$/, '').trim();
            if (title && !failNames.includes(title)) failNames.push(title);
          }
          break;
        }
      }
    }
  }

  // Categorize failure error types
  const errorTypes = {};
  const bump = (key) => {
    errorTypes[key] = (errorTypes[key] || 0) + 1;
  };
  const count401 = (content.match(/401:\s*Unauthorized/g) || []).length;
  const count400 = (content.match(/400:\s*Bad Request/g) || []).length;
  const countTimeout = (content.match(/Timed out retrying after/g) || []).length;
  const countTypeError = (content.match(/TypeError:/g) || []).length;
  if (count401) bump(`401 Unauthorized (${count401})`);
  if (count400) bump(`400 Bad Request (${count400})`);
  if (countTimeout) bump(`Assertion timeout (${countTimeout})`);
  if (countTypeError) bump(`TypeError (${countTypeError})`);

  const baseUrlMatch = content.match(/Base URL:\s*(\S+)/);
  const crashed = /Error: Command failed|Oops.*error|Cypress could not/i.test(content);

  return {
    baseUrl: baseUrlMatch ? baseUrlMatch[1] : 'default (cypress.config.js)',
    found: foundMatch ? parseInt(foundMatch[1], 10) : null,
    specs: specsMatch ? parseInt(specsMatch[1], 10) : null,
    marked: markedMatch ? parseInt(markedMatch[1], 10) : null,
    tests,
    passing,
    failing,
    pending,
    skipped,
    errorTypes: Object.keys(errorTypes),
    failNames,
    incomplete: crashed || !markedMatch,
  };
}

function main() {
  const { dir, showFailures } = parseArgs();
  const logsDir = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(logsDir)) {
    console.error(`Logs directory not found: ${logsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(logsDir)
    .filter((f) => f.endsWith('.log'))
    .sort();

  if (!files.length) {
    console.error(`No .log files in ${logsDir}`);
    process.exit(1);
  }

  const rows = files.map((f) => {
    const content = fs.readFileSync(path.join(logsDir, f), 'utf8');
    return { env: f.replace(/\.log$/, ''), ...analyzeLog(content) };
  });

  const col = (v, w) => String(v ?? '-').padEnd(w);
  const num = (v, w) => String(v ?? '-').padStart(w);
  const E = Math.max(20, ...rows.map((r) => r.env.length));

  console.log(`\n${'='.repeat(E + 62)}`);
  console.log('  FAILURE STATISTICS PER ENVIRONMENT');
  console.log('='.repeat(E + 62));
  console.log(
    `  ${col('ENV (launch-team)', E)}  ${num('FOUND', 6)}  ${num('SPECS', 6)}  ${num('TESTS', 6)}  ${num('PASS', 6)}  ${num('FAIL', 6)}  ${num('MARKED', 7)}`,
  );
  console.log(`  ${'-'.repeat(E + 60)}`);

  const totals = { found: 0, specs: 0, tests: 0, passing: 0, failing: 0, marked: 0 };

  for (const r of rows) {
    ['found', 'specs', 'tests', 'passing', 'failing', 'marked'].forEach((k) => {
      if (typeof r[k] === 'number') totals[k] += r[k];
    });
    console.log(
      `  ${col(r.env, E)}  ${num(r.found, 6)}  ${num(r.specs, 6)}  ${num(r.tests, 6)}  ${num(r.passing, 6)}  ${num(r.failing, 6)}  ${num(r.marked, 7)}${r.incomplete ? '  (incomplete)' : ''}`,
    );
  }

  console.log(`  ${'-'.repeat(E + 60)}`);
  console.log(
    `  ${col('TOTAL', E)}  ${num(totals.found, 6)}  ${num(totals.specs, 6)}  ${num(totals.tests, 6)}  ${num(totals.passing, 6)}  ${num(totals.failing, 6)}  ${num(totals.marked, 7)}`,
  );
  console.log('='.repeat(E + 62));

  // Error-type breakdown per env
  console.log('\n  FAILURE CATEGORIES PER ENVIRONMENT');
  console.log(`  ${'-'.repeat(E + 60)}`);
  for (const r of rows) {
    const cats = r.errorTypes.length ? r.errorTypes.join(', ') : 'none / passed';
    console.log(`  ${col(r.env, E)}  ${cats}`);
  }

  if (showFailures) {
    console.log('\n  FAILING TESTS PER ENVIRONMENT');
    console.log(`  ${'='.repeat(E + 60)}`);
    for (const r of rows) {
      console.log(`\n  ● ${r.env}  (${r.failNames.length} failing)`);
      if (!r.failNames.length) {
        console.log('     (no failing tests parsed)');
      } else {
        r.failNames.forEach((n) => console.log(`     - ${n}`));
      }
    }
  }

  console.log(
    '\nColumns: FOUND = to-investigate found in RP, SPECS = spec files rerun, TESTS/PASS/FAIL = summed Cypress results, MARKED = marked flaky.',
  );
  console.log('Run with --failures to list failing test names per env.\n');
}

main();
