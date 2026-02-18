import moment from 'moment';

import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Integrations from '../../../support/fragments/organizations/integrations/integrations';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    const now = moment();
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
    };
    const testData = {
      user: {},
      userUUIDsFileName: `userUUIDs_${getRandomPostfix()}.csv`,
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
          organization.id = organizationsResponse;
          order.vendor = organizationsResponse;

          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then((acqMethod) => {
            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (locationResp) => {
                MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
                  (mtypes) => {
                    const orderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 20.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 20.0,
                      },
                      locations: [
                        { locationId: locationResp.id, quantity: 1, quantityPhysical: 1 },
                      ],
                      acquisitionMethod: acqMethod.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtypes.body.id,
                        volumes: [],
                      },
                      automaticExport: true,
                      vendorDetail: { vendorAccount: null },
                    };
                    cy.createOrderApi(order).then((orderResponse) => {
                      testData.orderNumber = orderResponse.body.poNumber;
                      orderLine.purchaseOrderId = orderResponse.body.id;

                      OrderLines.createOrderLineViaApi(orderLine);
                      Orders.updateOrderViaApi({
                        ...orderResponse.body,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      }).then(() => {
                        testData.integration = Integrations.getDefaultIntegration({
                          vendorId: organization.id,
                          acqMethodId: acqMethod.body.acquisitionMethods[0].id,
                          accountNoList: [organization.accounts[0].accountNo],
                          scheduleTime: now.utc().format('HH:mm:ss'),
                          isDefaultConfig: true,
                        });
                        testData.integrationName =
                          testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
                        Integrations.createIntegrationViaApi(testData.integration);
                      });
                    });
                  },
                );
              },
            );
          });
        });
        cy.loginAsAdmin({
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${testData.userUUIDsFileName}`,
          testData.user.userId,
        );
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(testData.userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
      });

      cy.createTempUser([Permissions.exportManagerAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(organization.id);
        Integrations.deleteIntegrationViaApi(testData.integration.id);
        Orders.deleteOrderViaApi(order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C378884 "EDIFACT orders export" option is added to job type filter in "Export manager" app (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C378884'] },
      () => {
        // Check default page view
        ExportManagerSearchPane.checkDefaultView();

        // Check "Successful" checkboxe in the "Status" accordion on "Search & filter" pane
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Successful' });
        ExportManagerSearchPane.checkColumnInResultsTable({ status: 'Successful' });

        // Check "Failed" checkboxe in the "Status" accordion on "Search & filter" pane
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Failed', resetAll: true });
        ExportManagerSearchPane.checkColumnInResultsTable({ status: 'Failed' });

        // Click on "Reset all" button on the "Search & filters" pane
        ExportManagerSearchPane.resetAll();
        ExportManagerSearchPane.checkNoResultsMessage();

        // Check "Job type" contains the following options:
        ExportManagerSearchPane.checkFilterOptions({
          jobTypeFilterOption: [
            'Authority control',
            'Bursar',
            'Circulation log',
            'eHoldings',
            'Orders (EDI)',
            'Orders (CSV)',
          ],
        });

        // Check "EDIFACT orders export" option in "Job type" accordion
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (EDI)' });
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (CSV)' });
        ExportManagerSearchPane.checkColumnInResultsTable({ jobType: 'EDIFACT orders export' });

        // Uncheck "EDIFACT orders export" option in "Job type" accordion
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (EDI)' });
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (CSV)' });
        ExportManagerSearchPane.checkNoResultsMessage();
      },
    );
  });
});
