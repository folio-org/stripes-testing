import moment from 'moment';

import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const now = moment();
    const today = moment().format('M/D/YYYY');
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      order: {},
      orderLine: {},
      integration: {},
      integrationName: '',
      jobId: '',
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

      cy.createTempUser([Permissions.exportManagerView.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.exportManagerOrganizationsPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
      cy.wait(1000);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Integrations.deleteIntegrationViaApi(testData.integration.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C350564 Verify if Export Job contains exported file details (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C350564'] },
      () => {
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(testData.integrationName);
        const exportDetails = ExportManagerSearchPane.selectJobByIntegrationInList(
          testData.integrationName,
        );

        ExportDetails.verifyJobLabels();
        exportDetails.checkExportJobDetails({
          exportInformation: [
            { key: 'Job ID', value: testData.jobId },
            { key: 'Status', value: 'Successful' },
            { key: 'Source', value: 'System' },
            { key: 'Start time', value: today },
            { key: 'End time', value: today },
            { key: 'Export method', value: testData.integrationName },
            { key: 'Organization', value: testData.organization.name },
            {
              key: 'Sent to',
              value: `${
                testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediFtp
                  .serverAddress
              }${
                testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediFtp
                  .orderDirectory
              }`,
            },
            { key: 'File name', value: testData.integrationName },
          ],
        });
      },
    );
  });
});
