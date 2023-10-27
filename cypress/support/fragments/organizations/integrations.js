import getRandomPostfix from '../../utils/stringTools';

export default {
  getDefaultIntegration({ vendorId, acqMethodId, accountNoList, scheduleTime } = {}) {
    return {
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
            ftpFormat: 'FTP',
            ftpMode: 'ASCII',
            ftpConnMode: 'Active',
            serverAddress: 'ftp://ftp.ci.folio.org',
            username: 'folio',
            password: 'Ffx29%pu',
            ftpPort: '22',
            orderDirectory: '/files',
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
};
