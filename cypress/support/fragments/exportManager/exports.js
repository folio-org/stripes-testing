import moment from 'moment';

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
};
