import uuid from 'uuid';

import { ORGANIZATION_INTEGRATION_CONFIG } from '../../../constants';
import getRandomPostfix from '../../../utils/stringTools';

const { EXPORT_TYPES, FILE_FORMATS, INTEGRATION_TYPES, TRANSMISSION_METHODS } =
  ORGANIZATION_INTEGRATION_CONFIG;

export default {
  getDefaultIntegration({
    vendorId,
    acqMethodId,
    accountNoList = [],
    ediFtp = {},
    ediSchedule,
    isDefaultConfig,
    scheduleTime,
    fileFormat = FILE_FORMATS.EDI,
    integrationType = INTEGRATION_TYPES.ORDERING,
    transmissionMethod = TRANSMISSION_METHODS.FTP,
    type = EXPORT_TYPES.EDIFACT_ORDERS,
  } = {}) {
    const integrationName = `autotest_config_name_${getRandomPostfix()}`;
    return {
      id: uuid(),
      schedulePeriod: 'NONE',
      type,
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
          configName: integrationName,
          configDescription: `autotest_config_description_${getRandomPostfix()}`,
          ediSchedule: ediSchedule || {
            enableScheduledExport: true,
            scheduleParameters: {
              schedulePeriod: 'DAY',
              scheduleFrequency: 1,
              scheduleTime: scheduleTime || '00:00:00',
            },
          },
          isDefaultConfig,
          integrationType,
          transmissionMethod,
          fileFormat,
        },
      },
      integrationName,
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
  getIntegrationConfigViaApi(configId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `data-export-spring/configs/${configId}`,
      })
      .then(({ body }) => body);
  },
  deleteIntegrationViaApi(configId, { failOnStatusCode = false } = {}) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-export-spring/configs/${configId}`,
      failOnStatusCode,
    });
  },
};
