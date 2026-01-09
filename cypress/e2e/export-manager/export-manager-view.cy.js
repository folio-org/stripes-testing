import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';

import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../support/fragments/organizations';

let user;
let now;
let testData;

describe(
  'Export Manager',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    beforeEach('create test data', () => {
      now = moment();
      testData = {
        organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
        order: {},
        orderLine: {},
        integration: {},
        integrationName: '',
      };

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

      cy.createTempUser([permissions.exportManagerView.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
      cy.wait(10000);
    });

    afterEach('delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Integrations.deleteIntegrationViaApi(testData.integration.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C788689 Verify that User is able to see the executed jobs but not to download the files with View permissions (firebird)',
      { tags: ['criticalPath', 'firebird', 'C788689'] },
      () => {
        ExportManagerSearchPane.waitLoading();
        ExportManagerSearchPane.searchByAuthorityControl();
        ExportManagerSearchPane.searchByBursar();
        ExportManagerSearchPane.searchByCirculationLog();
        ExportManagerSearchPane.searchByEHoldings();
        ExportManagerSearchPane.searchByCsvOrders();
        ExportManagerSearchPane.searchByEdifactOrders();
        ExportManagerSearchPane.searchBySuccessful();
        ExportManagerSearchPane.selectSearchResultItem();
        ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();

        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.searchBySuccessful();
        ExportManagerSearchPane.searchByInProgress();
        ExportManagerSearchPane.searchByScheduled();
        ExportManagerSearchPane.searchByFailed();

        ExportManagerSearchPane.searchByInProgress();
        ExportManagerSearchPane.searchByScheduled();
        ExportManagerSearchPane.searchByFailed();
        ExportManagerSearchPane.selectJob(testData.integrationName);
        ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
        ExportDetails.verifyJobLabels();
      },
    );
  },
);
