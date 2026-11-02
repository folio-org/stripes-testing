// On a failed test, logs job statuses and record errors of the data import files it uploaded
// (Allure does not capture the job log). Read-only, never asserts. Hooked in support/e2e.js afterEach.
const ENV_KEY = 'diUploadedFiles';
const MAX_FILES = 3;
const MAX_ENTRIES = 20;
const PREFIX = '[DI diagnostics]';

const rememberUpload = (fileName) => {
  if (!fileName) return;
  const files = Cypress.env(ENV_KEY) || [];
  Cypress.env(ENV_KEY, [...files.filter((name) => name !== fileName), fileName].slice(-MAX_FILES));
};

const getQuietly = (path, searchParams) => cy
  .okapiRequest({
    path,
    searchParams,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
    customTimeout: 30_000,
  })
  .then(({ status, body }) => (status === 200 ? body : null));

// "error" of the record plus "error" of every related*Info (an object or an array of objects)
const errorsOf = (entry) => {
  const errors = entry.error ? [`record: ${entry.error}`] : [];
  Object.entries(entry).forEach(([key, value]) => {
    if (!/^related\w+Info$/.test(key)) return;
    [].concat(value || []).forEach((info) => {
      if (info?.error) errors.push(`${key.replace(/^related|Info$/g, '')}: ${info.error}`);
    });
  });
  return errors;
};

const logJobsOfFile = (fileName) => {
  // split jobs are named "<timestamp>-<name>_<part>.<ext>", so match on the name without its extension
  const baseName = fileName.replace(/\.[^.]+$/, '');
  getQuietly('metadata-provider/jobExecutions', { fileName: `*${baseName}*`, limit: 10 }).then(
    (body) => {
      const jobs = body?.jobExecutions || [];
      if (!jobs.length) {
        cy.log(`${PREFIX} ${fileName}: no jobs found`);
        return;
      }
      jobs.forEach((job) => {
        cy.log(
          `${PREFIX} ${job.fileName} (${job.subordinationType}): ${job.status} / ${job.uiStatus}`,
        );
        // a composite parent has no records of its own; its children do
        if (job.subordinationType === 'COMPOSITE_PARENT') return;
        getQuietly(`metadata-provider/jobLogEntries/${job.id}`, { limit: MAX_ENTRIES }).then(
          (log) => {
            (log?.entries || []).forEach((entry) => {
              const errors = errorsOf(entry);
              cy.log(
                `${PREFIX} record ${entry.sourceRecordOrder}: ${entry.sourceRecordActionStatus || '-'}` +
                  (errors.length ? ` - ${errors.join('; ')}` : ''),
              );
            });
          },
        );
      });
    },
  );
};

const logForFailedTest = (test) => {
  const files = Cypress.env(ENV_KEY) || [];
  Cypress.env(ENV_KEY, []);
  if (test?.state !== 'failed' || !files.length) return;
  files.forEach(logJobsOfFile);
};

export default { rememberUpload, logForFailedTest };
