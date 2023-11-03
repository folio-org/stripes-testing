import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

export default {
  getDefaultIntegration({
    vendorId,
    acqMethodId,
    accountNoList = [],
    ediFtp = {},
    isDefaultConfig,
    scheduleTime,
  } = {}) {
    return {
      id: uuid(),
      schedulePeriod: 'NONE',
      type: 'EDIFACT_ORDERS_EXPORT',
      exportTypeSpecificParameters: {
        vendorEdiOrdersExportConfig: {
          vendorId,
          ediConfig: {
            vendorEdiCode: getRandomPostfix(),
            vendorEdiType: '31B/US-SAN',
            libEdiCode: getRandomPostfix(),
            libEdiType: '31B/US-SAN',
            ediNamingConvention: '{organizationCode}-{integrationName}-{exportJobEndDate}',
            supportOrder: true,
            defaultAcquisitionMethods: [acqMethodId],
            accountNoList,
          },
          ediFtp: {
            ftpFormat: ediFtp.ftpFormat || 'FTP',
            ftpMode: ediFtp.ftpMode || 'ASCII',
            ftpConnMode: ediFtp.ftpConnMode || 'Active',
            serverAddress: ediFtp.serverAddress || 'ftp://ftp.ci.folio.org',
            username: ediFtp.username || 'folio',
            password: ediFtp.password || 'Ffx29%pu',
            ftpPort: ediFtp.ftpPort || '22',
            orderDirectory: ediFtp.orderDirectory || '/files',
          },
          configName: `autotest_config_name_${getRandomPostfix()}`,
          configDescription: `autotest_config_description_${getRandomPostfix()}`,
          ediSchedule: {
            enableScheduledExport: true,
            scheduleParameters: {
              schedulePeriod: 'DAY',
              scheduleFrequency: 1,
              scheduleTime,
            },
          },
          isDefaultConfig,
        },
      },
    };
  },
  createIntegrationViaApi(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export-spring/configs',
        body: config,
      })
      .then(({ body }) => body);
  },
  deleteIntegrationViaApi(configId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-export-spring/configs/${configId}`,
    });
  },
};
