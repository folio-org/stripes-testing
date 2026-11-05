import moment from 'moment';
import { recurse } from 'cypress-recurse';
import { DEFAULT_WAIT_TIME, EXPORT_MANAGER_JOB_STATUSES } from '../../constants';

const PENDING_EXPORT_JOB_STATUSES_SET = new Set([
  EXPORT_MANAGER_JOB_STATUSES.SCHEDULED,
  EXPORT_MANAGER_JOB_STATUSES.IN_PROGRESS,
]);

export default {
  getExportJobsViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'data-export-spring/jobs',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },

  /**
   * Polls an export job until the asynchronous export processing has finished.
   *
   * @param {string} jobId - Identifier of the export job to retrieve.
   * @param {Object} [options] - Polling configuration passed to `cypress-recurse`.
   * @param {number} [options.delay=5000] - Delay between status requests in milliseconds.
   * @param {number} [options.timeout=600000] - Maximum time to wait for a terminal status in milliseconds.
   * @returns {Cypress.Chainable<Object>} The export job with a terminal status.
   */
  getFinishedExportJobViaApi(jobId, { delay = DEFAULT_WAIT_TIME, timeout = 60_000 } = {}) {
    return recurse(
      () => cy
        .okapiRequest({
          path: `data-export-spring/jobs/${jobId}`,
          isDefaultSearchParamsRequired: false,
        })
        .then(({ body }) => body),
      (job) => Boolean(job && !PENDING_EXPORT_JOB_STATUSES_SET.has(job.status)),
      {
        delay,
        timeout,
        error: `Export job ${jobId} did not finish within ${timeout}ms`,
      },
    );
  },

  createExportJobViaApi(exportJob) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export-spring/jobs',
        body: exportJob,
      })
      .then(({ body }) => {
        return body;
      });
  },
  updateExportJobViaApi(exportJob) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `data-export-spring/jobs/${exportJob.id}`,
      body: exportJob,
    });
  },
  deleteExportJobViaApi(exportJobId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-export-spring/jobs/${exportJobId}`,
    });
  },
  rerurnExportJob({ vendorId }) {
    const now = moment();
    this.getExportJobsViaApi({
      query: `(type=="EDIFACT_ORDERS_EXPORT" and jsonb.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.vendorId=="${vendorId}")`,
    }).then(({ jobRecords }) => {
      now.set('second', now.second() + 10);

      jobRecords
        .filter(({ status }) => status === 'SUCCESSFUL')
        .forEach((job) => {
          this.createExportJobViaApi({
            type: 'EDIFACT_ORDERS_EXPORT',
            exportTypeSpecificParameters: {
              ...job.exportTypeSpecificParameters,
              vendorEdiOrdersExportConfig: {
                ...job.exportTypeSpecificParameters.vendorEdiOrdersExportConfig,
                ediSchedule: {
                  ...job.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule,
                  scheduleParameters: {
                    ...job.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule
                      .scheduleParameters,
                    scheduleTime: now.utc().format('HH:mm:ss'),
                  },
                },
              },
            },
          });
        });
    });
  },

  /* Interceptions */

  interceptGetExportJobs() {
    return cy
      .intercept('GET', '/data-export-spring/jobs*')
      .as('waiterForGetExportJobsQueryCompleted');
  },

  waitForGetExportJobsQueryCompleted() {
    return cy.wait('@waiterForGetExportJobsQueryCompleted');
  },

  interceptGetExportConfigs() {
    return cy
      .intercept('GET', '/data-export-spring/configs*')
      .as('waiterForGetExportConfigsQueryCompleted');
  },

  waitForGetExportConfigsQueryCompleted() {
    return cy.wait('@waiterForGetExportConfigsQueryCompleted');
  },
};
