#!/usr/bin/env -S npx tsx

/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { clearLine, cursorTo } from 'node:readline';
import { Command, InvalidArgumentError, Option } from 'commander';

type SharedCliOptions = {
  runs: number;
  threads: number;
  browser: string;
  timeoutSec: number;
  outDir: string;
};

// Repeats each selected Cypress spec through a bounded worker pool and records every run independently.
type CliOptions = SharedCliOptions & {
  specs: string[];
};

type ParsedCliOptions = SharedCliOptions & {
  spec?: string[];
  specsFile?: string;
  thread?: number;
};

type SpecRunConfig = SharedCliOptions & {
  spec: string;
  specNumber: number;
  specCount: number;
};

type OutputPaths = {
  logsDir: string;
  filePrefix: string;
  summaryPath: string;
};

type RunResult = {
  runNumber: number;
  passed: boolean;
  exitCode: number;
  signal: NodeJS.Signals | null;
  reason: string;
  logPath: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
};

type WorkerPoolResult = {
  results: RunResult[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  peakConcurrency: number;
};

type SpecResult = WorkerPoolResult & {
  config: SpecRunConfig;
  output: OutputPaths;
  passed: number;
  failed: number;
  passRate: number;
  classification: string;
};

type ProcessCompletion = {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  startError?: string;
};

type ProcessContext = {
  child: ChildProcessWithoutNullStreams;
  outStream: fs.WriteStream;
  runNumber: number;
  logPath: string;
  timeoutSec: number;
};

const cwd = process.cwd();
const colorsEnabled = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const color = (code: string) => (text: string | number) => (
  colorsEnabled ? `\u001b[${code}m${text}\u001b[0m` : String(text)
);
const styles = {
  bold: color('1'),
  cyan: color('36'),
  green: color('32'),
  yellow: color('33'),
  red: color('31'),
  dim: color('2'),
};

const formatDuration = (durationMs: number): string => {
  const elapsedSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

const formatElapsed = (startedAt: number): string => {
  return formatDuration(Date.now() - startedAt);
};

const clearProgress = (): void => {
  [process.stdout]
    .filter(() => Boolean(process.stdout.isTTY))
    .forEach((output) => {
      clearLine(output, 0);
      cursorTo(output, 0);
    });
};

const invalidNumber = (message: string): never => {
  throw new InvalidArgumentError(message);
};

const positiveInt = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : invalidNumber('must be a positive integer');
};

const nonNegativeInt = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : invalidNumber('must be a non-negative integer');
};

const commaSeparatedSpecs = (value: string): string[] => {
  const specs = value.split(',').map((spec) => spec.trim()).filter(Boolean);
  return specs.length ? specs : invalidNumber('must contain at least one spec');
};

const program = new Command()
  .name('cypress-concurrent-repeat-runner')
  .description('Run Cypress specs repeatedly with bounded concurrency')
  .addOption(new Option('-s, --spec <paths>', 'comma-separated Cypress specs').argParser(commaSeparatedSpecs).conflicts('specsFile'))
  .addOption(new Option('-f, --specs-file <path>', 'file containing one Cypress spec per line').conflicts('spec'))
  .option('-r, --runs <number>', 'total repetitions', positiveInt, 10)
  .option('-t, --threads <number>', 'maximum concurrent runs', positiveInt, 1)
  .addOption(new Option('--thread <number>', 'alias for --threads').argParser(positiveInt).hideHelp())
  .option('-b, --browser <name>', 'Cypress browser', 'chrome')
  .option('--timeout-sec <seconds>', 'timeout for each run; 0 disables it', nonNegativeInt, 0)
  .option('-o, --out-dir <path>', 'log directory', '.local/cypress-run-logs')
  .showSuggestionAfterError()
  .showHelpAfterError(styles.dim('(run with --help for usage)'))
  .addHelpText('after', `
${styles.cyan('Examples:')}
  npx tsx scripts/cypress-concurrent-repeat-runner.ts --spec cypress/e2e/example.cy.js
  npx tsx scripts/cypress-concurrent-repeat-runner.ts --spec cypress/e2e/first.cy.js,cypress/e2e/second.cy.js --runs 10 --threads 3
  npx tsx scripts/cypress-concurrent-repeat-runner.ts --specs-file specs.txt --runs 5 --threads 2

${styles.dim('Set NO_COLOR=1 to disable colored output.')}`);

program.parse();

const cliError = (message: string): never => program.error(message);

/** Reads one spec per line, trimming whitespace and ignoring empty rows. */
const readSpecsFile = (filePath: string): string[] => {
  const resolvedPath = path.resolve(cwd, filePath);
  const isFile = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
  const contents = isFile
    ? fs.readFileSync(resolvedPath, 'utf8')
    : cliError(`specs file does not exist: ${filePath}`);
  const specs = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return specs.length
    ? specs
    : cliError(`specs file contains no specs: ${filePath}`);
};

const parsedOptions = program.opts<ParsedCliOptions>();
const {
  spec: singleSpec,
  specsFile: specsFilePath,
  thread: threadAlias,
  ...sharedOptions
} = parsedOptions;
const resolvedSpecs = specsFilePath
  ? readSpecsFile(specsFilePath)
  : singleSpec || [];
const options: CliOptions = {
  ...sharedOptions,
  specs: resolvedSpecs.length ? resolvedSpecs : cliError('one of --spec or --specs-file is required'),
  threads: threadAlias ?? parsedOptions.threads,
};

const ensureDir = (dirPath: string): void => {
  [dirPath]
    .filter(() => !fs.existsSync(dirPath))
    .forEach((directory) => fs.mkdirSync(directory, { recursive: true }));
};

// Produces stable, portable log names from either a spec path or a glob expression.
const sanitizeForFileName = (input: string): string => input
  .replace(/[\\/]+/g, '-')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

/** Extracts the most useful Cypress failure line without loading an unbounded log into memory. */
const detectFailureReason = (text: string, timedOut: boolean, timeoutSec: number): string => {
  const patterns = [
    /^[ \t]*\d+\)[ \t][^\r\n]*$/m,
    /CypressError:.*$/m,
    /AssertionError:.*$/m,
    /Timed out.*$/m,
    /Error:.*$/m,
  ];
  const matchedReason = patterns
    .map((pattern) => pattern.exec(text)?.[0]?.trim())
    .find(Boolean);

  return timedOut
    ? `Timed out after ${timeoutSec}s`
    : matchedReason || 'No parsable reason found in log';
};

/** Initializes a fresh set of run logs while preserving the summary metadata for this invocation. */
const prepareOutput = ({
  spec,
  specNumber,
  specCount,
  threads,
  runs,
  browser,
  timeoutSec,
  outDir,
}: SpecRunConfig): OutputPaths => {
  const logsDir = path.resolve(cwd, outDir);
  const basePrefix = sanitizeForFileName(path.basename(spec, '.cy.js') || path.basename(spec));
  const filePrefix = specCount > 1
    ? `${String(specNumber).padStart(3, '0')}-${basePrefix}`
    : basePrefix;
  const summaryPath = path.join(logsDir, `${filePrefix}-summary.txt`);

  ensureDir(logsDir);
  fs.readdirSync(logsDir)
    .filter((file) => file.startsWith(`${filePrefix}-run-`) && file.endsWith('.log'))
    .forEach((file) => fs.unlinkSync(path.join(logsDir, file)));

  const timeoutSummary = timeoutSec > 0 ? `Timeout per run: ${timeoutSec}s` : '';
  const summary = [
    'Cypress concurrent repeat summary',
    `Spec: ${spec}`,
    `Spec number: ${specNumber}/${specCount}`,
    `Threads: ${threads}`,
    `Runs: ${runs}`,
    `Browser: ${browser}`,
    timeoutSummary,
    '',
  ].filter(Boolean).join('\n');

  fs.writeFileSync(
    summaryPath,
    `${summary}\n\n`,
    'utf8',
  );

  return { logsDir, filePrefix, summaryPath };
};

// A missing exit code means the child ended abnormally; 124 follows the conventional timeout exit code.
const resolveExitCode = (code: number | null | undefined, timedOut: boolean): number => {
  const processExitCode = typeof code === 'number' ? code : 1;
  return timedOut ? 124 : processExitCode;
};

/** Captures one Cypress process, enforcing its timeout and resolving exactly once on error or close. */
const waitForCompletion = ({
  child,
  outStream,
  runNumber,
  logPath,
  timeoutSec,
}: ProcessContext): Promise<RunResult> => new Promise((resolve) => {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  let output = '';
  let timedOut = false;
  let settled = false;
  let timer: NodeJS.Timeout | undefined;

  const capture = (chunk: Buffer): void => {
    const text = chunk.toString();
    // Keep only the latest output for error detection; the complete stream is retained in the log file.
    output = `${output}${text}`.slice(-1_000_000);
    outStream.write(text);
  };

  const finish = (completion: ProcessCompletion): void => {
    // Both error and close may fire for a failed spawn, so only the first event may settle the run.
    [completion]
      .filter(() => !settled)
      .forEach(({ code, signal, startError }) => {
        settled = true;
        clearTimeout(timer);
        const exitCode = resolveExitCode(code, timedOut);
        const passed = exitCode === 0;
        const reason = passed
          ? ''
          : startError || detectFailureReason(output, timedOut, timeoutSec);
        const endedAtMs = Date.now();

        outStream.end();
        resolve({
          runNumber,
          passed,
          exitCode,
          signal: signal ?? null,
          reason,
          logPath,
          startedAt,
          endedAt: new Date(endedAtMs).toISOString(),
          durationMs: endedAtMs - startedAtMs,
        });
      });
  };

  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  // Bridge conflicting Node type versions while retaining typed process event callbacks.
  const processEvents = child as unknown as EventEmitter;
  processEvents.addListener('error', (error: Error) => finish({
    startError: `Failed to start Cypress: ${error.message}`,
  }));
  processEvents.addListener('close', (code: number | null, signal: NodeJS.Signals | null) => finish({
    code,
    signal,
  }));

  timer = timeoutSec > 0
    ? setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutSec * 1000)
    : undefined;
});

/** Starts Cypress through the repository-local executable so every worker uses the pinned version. */
const runOne = ({
  runNumber,
  logsDir,
  filePrefix,
  spec,
  browser,
  timeoutSec,
}: SpecRunConfig & OutputPaths & { runNumber: number }): Promise<RunResult> => {
  const logPath = path.join(logsDir, `${filePrefix}-run-${runNumber}.log`);
  const outStream = fs.createWriteStream(logPath, { flags: 'w' });
  const cypressExecutable = path.resolve(cwd, 'node_modules/cypress/bin/cypress');
  const child = spawn(process.execPath, [
    cypressExecutable,
    'run',
    '--e2e',
    '-b',
    browser,
    '--spec',
    spec,
  ], {
    cwd,
    shell: false,
  });

  return waitForCompletion({ child, outStream, runNumber, logPath, timeoutSec });
};

/** Schedules all repetitions without allowing active Cypress processes to exceed the thread limit. */
const runWorkerPool = async (config: SpecRunConfig, output: OutputPaths): Promise<WorkerPoolResult> => {
  // Workers claim the next run from shared state, keeping concurrency at or below --threads.
  const state = { nextRun: 1, active: 0 };
  const results: RunResult[] = [];
  const activeRuns = new Set<number>();
  const workerCount = Math.min(config.threads, config.runs);
  const startedAt = Date.now();
  let peakConcurrency = 0;
  const renderProgress = (): void => {
    const runNumbers = [...activeRuns].sort((first, second) => first - second).join(', ');
    const progress = `[Progress] elapsed ${formatElapsed(startedAt)} | completed ${results.length}/${config.runs} | active ${state.active} (${runNumbers})`;

    [progress]
      .filter(() => Boolean(process.stdout.isTTY && activeRuns.size))
      .forEach((message) => {
        clearProgress();
        process.stdout.write(styles.dim(message));
      });
  };
  const progressTimer = setInterval(renderProgress, 1000);
  progressTimer.unref();

  const worker = async (): Promise<void> => {
    const runNumber = state.nextRun;
    const hasWork = runNumber <= config.runs;
    state.nextRun += Number(hasWork);

    return hasWork
      ? Promise.resolve()
        .then(() => {
          state.active += 1;
          peakConcurrency = Math.max(peakConcurrency, state.active);
          activeRuns.add(runNumber);
          clearProgress();
          console.log(styles.cyan(`[Run ${runNumber}/${config.runs}] started (active: ${state.active})`));
          renderProgress();
          return runOne({ runNumber, ...config, ...output });
        })
        .then((result) => {
          results.push(result);
          state.active -= 1;
          activeRuns.delete(runNumber);
          clearProgress();
          console.log(result.passed
            ? styles.green(`[Run ${runNumber}/${config.runs}] PASSED (${formatDuration(result.durationMs)})`)
            : styles.red(`[Run ${runNumber}/${config.runs}] FAILED (exit ${result.exitCode}, ${formatDuration(result.durationMs)})`));
          [result.reason]
            .filter(Boolean)
            .forEach((reason) => console.log(styles.yellow(`  Reason: ${reason}`)));
          renderProgress();
          return worker();
        })
      : Promise.resolve();
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  clearInterval(progressTimer);
  clearProgress();
  const endedAt = Date.now();
  return {
    results: results.toSorted((first, second) => first.runNumber - second.runNumber),
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs: endedAt - startedAt,
    peakConcurrency,
  };
};

const getFailureGroups = (results: RunResult[]): Array<{ reason: string; count: number }> => Array.from(
  results
    .filter(({ passed }) => !passed)
    .reduce((groups, { reason }) => groups.set(reason, (groups.get(reason) || 0) + 1), new Map<string, number>()),
  ([reason, count]) => ({ reason, count }),
).toSorted((first, second) => second.count - first.count || first.reason.localeCompare(second.reason));

/** Appends complete per-run and per-spec statistics and returns structured data for aggregation. */
const writeSummary = (config: SpecRunConfig, output: OutputPaths, pool: WorkerPoolResult): SpecResult => {
  const { results, startedAt, endedAt, durationMs, peakConcurrency } = pool;
  const failed = results.filter(({ passed }) => !passed);
  const passed = results.length - failed.length;
  const passRate = results.length ? (passed / results.length) * 100 : 0;
  const failureGroups = getFailureGroups(results);
  const classifications = [
    { matches: failed.length === 0, value: 'ALL PASSED' },
    { matches: failed.length === results.length, value: 'ALL FAILED' },
  ];
  const classification = classifications.find(({ matches }) => matches)?.value || 'MIXED RESULTS';
  const lines = results.flatMap((result) => {
    const status = result.passed ? 'PASSED' : `FAILED (exit ${result.exitCode})`;
    return [
      `Run ${result.runNumber}: ${status}`,
      `Started: ${result.startedAt}`,
      `Ended: ${result.endedAt}`,
      `Duration: ${formatDuration(result.durationMs)} (${result.durationMs}ms)`,
      `Signal: ${result.signal || 'none'}`,
      ...result.reason ? [`Reason: ${result.reason}`] : [],
      `Log: ${path.relative(cwd, result.logPath)}`,
      '',
    ];
  });
  const failureLines = failureGroups.flatMap(({ reason, count }) => [`${count}x ${reason}`]);

  fs.appendFileSync(
    output.summaryPath,
    [
      ...lines,
      `Started: ${startedAt}`,
      `Ended: ${endedAt}`,
      `Duration: ${formatDuration(durationMs)} (${durationMs}ms)`,
      `Peak concurrency: ${peakConcurrency}/${config.threads}`,
      `Passed: ${passed}`,
      `Failed: ${failed.length}`,
      `Pass rate: ${passRate.toFixed(2)}%`,
      `Classification: ${classification}`,
      '',
      'Failure groups:',
      ...failureLines.length ? failureLines : ['none'],
    ].join('\n'),
    'utf8',
  );

  console.log(styles.bold('\n--- Summary ---'));
  console.log(`Summary file: ${styles.cyan(path.relative(cwd, output.summaryPath))}`);
  console.log(`Duration: ${formatDuration(durationMs)}`);
  console.log(`Peak concurrency: ${peakConcurrency}/${config.threads}`);
  console.log(`Passed: ${styles.green(passed)} / ${results.length}`);
  console.log(`Failed: ${failed.length ? styles.red(failed.length) : styles.green(failed.length)} / ${results.length}`);
  console.log(`Pass rate: ${passRate.toFixed(2)}%`);
  console.log(`Classification: ${failed.length ? styles.yellow(classification) : styles.green(classification)}`);

  return {
    ...pool,
    config,
    output,
    passed,
    failed: failed.length,
    passRate,
    classification,
  };
};

/** Runs one spec and returns its complete statistics before the next file row is processed. */
const runSpec = async (config: SpecRunConfig): Promise<SpecResult> => {
  console.log(styles.bold(`\nSpec ${config.specNumber}/${config.specCount}: ${config.spec}`));
  const output = prepareOutput(config);
  const pool = await runWorkerPool(config, output);
  return writeSummary(config, output, pool);
};

/** Consumes the queue in order; only repeated runs for the current spec may execute concurrently. */
const runSpecsQueue = (queue: SpecRunConfig[]): Promise<SpecResult[]> => queue.reduce<Promise<SpecResult[]>>(
  (pendingResults, specConfig) => pendingResults.then(async (results) => [
    ...results,
    await runSpec(specConfig),
  ]),
  Promise.resolve([]),
);

/** Writes queue-wide totals so multi-spec executions can be assessed from one report. */
const writeAggregateSummary = (specResults: SpecResult[], outDir: string, startedAtMs: number): string => {
  const summaryPath = path.resolve(cwd, outDir, 'execution-summary.txt');
  const endedAtMs = Date.now();
  const totalRuns = specResults.reduce((total, specResult) => total + specResult.results.length, 0);
  const passed = specResults.reduce((total, specResult) => total + specResult.passed, 0);
  const failed = totalRuns - passed;
  const passRate = totalRuns ? (passed / totalRuns) * 100 : 0;
  const peakConcurrency = Math.max(...specResults.map((specResult) => specResult.peakConcurrency));
  const allRuns = specResults.flatMap((specResult) => specResult.results);
  const failureGroups = getFailureGroups(allRuns);
  const specLines = specResults.flatMap((specResult) => [
    `Spec ${specResult.config.specNumber}/${specResult.config.specCount}: ${specResult.config.spec}`,
    `  Runs: ${specResult.results.length} | Passed: ${specResult.passed} | Failed: ${specResult.failed} | Pass rate: ${specResult.passRate.toFixed(2)}%`,
    `  Duration: ${formatDuration(specResult.durationMs)} | Peak concurrency: ${specResult.peakConcurrency}/${specResult.config.threads}`,
    `  Classification: ${specResult.classification}`,
    `  Summary: ${path.relative(cwd, specResult.output.summaryPath)}`,
    '',
  ]);
  const failureLines = failureGroups.map(({ reason, count }) => `${count}x ${reason}`);

  fs.writeFileSync(summaryPath, [
    'Cypress concurrent repeat execution summary',
    `Started: ${new Date(startedAtMs).toISOString()}`,
    `Ended: ${new Date(endedAtMs).toISOString()}`,
    `Duration: ${formatDuration(endedAtMs - startedAtMs)} (${endedAtMs - startedAtMs}ms)`,
    `Specs: ${specResults.length}`,
    `Runs: ${totalRuns}`,
    `Configured threads: ${specResults[0]?.config.threads || 0}`,
    `Peak concurrency: ${peakConcurrency}`,
    `Passed: ${passed}`,
    `Failed: ${failed}`,
    `Pass rate: ${passRate.toFixed(2)}%`,
    '',
    ...specLines,
    'Failure groups:',
    ...failureLines.length ? failureLines : ['none'],
  ].join('\n'), 'utf8');

  console.log(styles.bold('\n=== Execution Summary ==='));
  console.log(`Summary file: ${styles.cyan(path.relative(cwd, summaryPath))}`);
  console.log(`Specs: ${specResults.length} | Runs: ${totalRuns}`);
  console.log(`Duration: ${formatDuration(endedAtMs - startedAtMs)} | Peak concurrency: ${peakConcurrency}`);
  console.log(`Passed: ${styles.green(passed)} | Failed: ${failed ? styles.red(failed) : styles.green(failed)} | Pass rate: ${passRate.toFixed(2)}%`);

  return summaryPath;
};

// Build the queue in CLI/file order and keep --threads scoped to one spec at a time.
const run = async (): Promise<void> => {
  const startedAt = Date.now();
  const { specs: selectedSpecs, ...config } = options;
  const queue = selectedSpecs.map((selectedSpec, index) => ({
    ...config,
    spec: selectedSpec,
    specNumber: index + 1,
    specCount: selectedSpecs.length,
  }));
  const specResults = await runSpecsQueue(queue);
  writeAggregateSummary(specResults, config.outDir, startedAt);

  process.exitCode = specResults.some(({ failed }) => failed > 0) ? 1 : 0;
};

run().catch((error: Error) => {
  console.error(styles.red(error.stack || error.message));
  process.exitCode = 1;
});
