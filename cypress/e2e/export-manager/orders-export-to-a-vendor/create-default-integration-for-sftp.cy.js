import moment from 'moment';

import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const now = moment();
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      order: {},
      orderLine: {},
      integration: {},
      integrationName: '',
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            now.set('second', now.second() + 10);
            testData.integration = Integrations.getDefaultIntegration({
              vendorId: testData.organization.id,
              acqMethodId: acqMethod.id,
              ediFtp: {
                ftpFormat: 'SFTP',
                serverAddress: 'sftp://ftp.ci.folio.org',
                orderDirectory: '/ftp/files/orders',
              },
              scheduleTime: now.utc().format('HH:mm:ss'),
              isDefaultConfig: true,
            });
            testData.integrationName =
              testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
            Integrations.createIntegrationViaApi(testData.integration);

            testData.order = NewOrder.getDefaultOrder({
              vendorId: testData.organization.id,
              manualPo: false,
            });
            testData.orderLine = BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: acqMethod.id,
              automaticExport: true,
              purchaseOrderId: testData.order.id,
              vendorDetail: { vendorAccount: null },
            });
            Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
              (order) => {
                testData.order = order;

                Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
              },
            );
          });
        });
      });

      cy.createTempUser([
        Permissions.exportManagerAll.gui,
        Permissions.exportManagerDownloadAndResendFiles.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.exportManagerOrganizationsPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });

      // wait for export complition
      cy.wait(10 * 1000);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Integrations.deleteIntegrationViaApi(testData.integration.id);
      FileManager.deleteFileFromDownloadsByMask(`*${testData.integrationName}*.edi`);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C402381 Creating default integration for "SFTP" option (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C402381'] },
      () => {
        // Click "Organizations", Select created export method in "Export method" accordion
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(testData.integrationName);

        // Click on the export job with "Successful" status
        const ExportDetails = ExportManagerSearchPane.selectJobByIntegrationInList(
          testData.integrationName,
        );
        ExportDetails.checkExportJobDetails([
          { key: 'Status', value: 'Successful' },
          { key: 'Source', value: 'System' },
          { key: 'Organization', value: testData.organization.name },
          { key: 'Export method', value: testData.integrationName },
          { key: 'Sent to', value: 'sftp://ftp.ci.folio.org/ftp/files/orders' },
          { key: 'File name', value: testData.integrationName },
        ]);

        // Click "Actions" button, Select "Download" option
        ExportDetails.downloadExportFile();

        // Check downloaded .edi file
        const present = false;
        FileManager.verifyFileIncludes(`*${testData.integrationName}*.edi`, ['RFF+API'], present);
      },
    );
  });
});
