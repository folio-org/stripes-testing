#!/usr/bin/env -S npx tsx

/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { clearLine, cursorTo } from 'node:readline';
import { Command, InvalidArgumentError, Option } from 'commander';

// Repeats one Cypress spec through a bounded worker pool and records each run independently.
type CliOptions = {
  spec: string;
  runs: number;
  threads: number;
  browser: string;
  timeoutSec: number;
  outDir: string;
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

const formatElapsed = (startedAt: number): string => {
  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
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

const program = new Command()
  .name('cypress-concurrent-repeat-runner')
  .description('Run one Cypress spec repeatedly with bounded concurrency')
  .requiredOption('-s, --spec <path>', 'Cypress spec to run')
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
  npx tsx scripts/cypress-concurrent-repeat-runner.ts --spec cypress/e2e/example.cy.js --runs 10 --threads 3

${styles.dim('Set NO_COLOR=1 to disable colored output.')}`);

program.parse();

const parsedOptions = program.opts<CliOptions & { thread?: number }>();
const options: CliOptions = {
  ...parsedOptions,
  threads: parsedOptions.thread ?? parsedOptions.threads,
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
const prepareOutput = ({ spec, threads, runs, browser, timeoutSec, outDir }: CliOptions): OutputPaths => {
  const logsDir = path.resolve(cwd, outDir);
  const filePrefix = sanitizeForFileName(path.basename(spec, '.cy.js') || path.basename(spec));
  const summaryPath = path.join(logsDir, `${filePrefix}-summary.txt`);

  ensureDir(logsDir);
  fs.readdirSync(logsDir)
    .filter((file) => file.startsWith(`${filePrefix}-run-`) && file.endsWith('.log'))
    .forEach((file) => fs.unlinkSync(path.join(logsDir, file)));

  const timeoutSummary = timeoutSec > 0 ? `Timeout per run: ${timeoutSec}s` : '';
  const summary = [
    'Cypress concurrent repeat summary',
    `Spec: ${spec}`,
    `Threads: ${threads}`,
    `Runs: ${runs}`,
    `Browser: ${browser}`,
    timeoutSummary,
    '',
  ].filter(Boolean).join('\n');

  fs.writeFileSync(
    summaryPath,
    summary,
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

        outStream.end();
        resolve({ runNumber, passed, exitCode, signal: signal ?? null, reason, logPath });
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
}: CliOptions & OutputPaths & { runNumber: number }): Promise<RunResult> => {
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
const runWorkerPool = async (config: CliOptions, output: OutputPaths): Promise<RunResult[]> => {
  // Workers claim the next run from shared state, keeping concurrency at or below --threads.
  const state = { nextRun: 1, active: 0 };
  const results: RunResult[] = [];
  const activeRuns = new Set<number>();
  const workerCount = Math.min(config.threads, config.runs);
  const startedAt = Date.now();
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

    return hasWork
      ? Promise.resolve()
        .then(() => {
          state.nextRun += 1;
          state.active += 1;
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
            ? styles.green(`[Run ${runNumber}/${config.runs}] PASSED`)
            : styles.red(`[Run ${runNumber}/${config.runs}] FAILED (exit ${result.exitCode})`));
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
  return results.toSorted((first, second) => first.runNumber - second.runNumber);
};

/** Appends deterministic per-run results and returns the failure count used for the CLI exit status. */
const writeSummary = (results: RunResult[], summaryPath: string): number => {
  const failed = results.filter(({ passed }) => !passed);
  const passed = results.length - failed.length;
  const classifications = [
    { matches: failed.length === 0, value: 'ALL PASSED' },
    { matches: failed.length === results.length, value: 'ALL FAILED' },
  ];
  const classification = classifications.find(({ matches }) => matches)?.value || 'MIXED RESULTS';
  const lines = results.flatMap((result) => {
    const status = result.passed ? 'PASSED' : `FAILED (exit ${result.exitCode})`;
    return [
      `Run ${result.runNumber}: ${status}`,
      ...result.reason ? [`Reason: ${result.reason}`] : [],
      `Log: ${path.relative(cwd, result.logPath)}`,
      '',
    ];
  });

  fs.appendFileSync(
    summaryPath,
    [...lines, `Passed: ${passed}`, `Failed: ${failed.length}`, `Classification: ${classification}`].join('\n'),
    'utf8',
  );

  console.log(styles.bold('\n--- Summary ---'));
  console.log(`Summary file: ${styles.cyan(path.relative(cwd, summaryPath))}`);
  console.log(`Passed: ${styles.green(passed)} / ${results.length}`);
  console.log(`Failed: ${failed.length ? styles.red(failed.length) : styles.green(failed.length)} / ${results.length}`);
  console.log(`Classification: ${failed.length ? styles.yellow(classification) : styles.green(classification)}`);

  return failed.length;
};

// Keep orchestration linear: prepare files, execute all runs, then expose aggregate success to the shell.
const run = async (): Promise<void> => {
  const output = prepareOutput(options);
  const results = await runWorkerPool(options, output);
  process.exitCode = writeSummary(results, output.summaryPath) > 0 ? 1 : 0;
};

run().catch((error: Error) => {
  console.error(styles.red(error.stack || error.message));
  process.exitCode = 1;
});
