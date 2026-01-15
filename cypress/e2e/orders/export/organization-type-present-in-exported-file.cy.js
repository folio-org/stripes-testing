import moment from 'moment';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Orders', () => {
  describe('Export', () => {
    const organizationTypes = [
      SettingsOrganizations.getDefaultOrganizationType(),
      SettingsOrganizations.getDefaultOrganizationType(),
      SettingsOrganizations.getDefaultOrganizationType(),
    ];
    const testData = {
      organizationTypes,
      organizationTypesNames: organizationTypes.map(({ name }) => `"${name}"`).join(' | '),
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        organizationTypes: organizationTypes.map(({ id }) => id),
      },
      fileName: `order-export-${moment().format('YYYY-MM-DD')}-*.csv`,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        testData.organizationTypes.forEach((organizationType) => {
          SettingsOrganizations.createTypesViaApi(organizationType);
        });
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine();

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;
            },
          );
        });
      });

      cy.createTempUser([Permissions.uiOrdersView.gui, Permissions.uiExportOrders.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFilesFromDownloadsByMask(testData.fileName);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        testData.organizationTypes.forEach((organizationType) => {
          SettingsOrganizations.deleteOrganizationTypeViaApi(organizationType.id);
        });
        Orders.deleteOrderViaApi(testData.order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353621 "Organization type" is present in exported .csv order (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353621'] },
      () => {
        // Search for the order from Preconditions
        Orders.searchByParameter('PO number', testData.order.poNumber);

        // Click "Actions" button on "Orders" pane and select "Export results (CSV)" option
        const ExportSettingsModal = Orders.clickExportResultsToCsvButton();

        // Click radio button to activate "PO fields to export" dropdown field
        ExportSettingsModal.selectOrderFieldsToExport('Organization type');

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Organization type" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((order) => {
            cy.expect(order['Organization type']).to.equal(testData.organizationTypesNames);
          });
        });

        // Search for the order from Preconditions
        Orders.searchByParameter('PO number', testData.order.poNumber);

        // Click "Actions" button on "Orders" pane and select "Export results (CSV)" option
        Orders.clickExportResultsToCsvButton();

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Organization type" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((order) => {
            cy.expect(order['Organization type']).to.equal(testData.organizationTypesNames);
          });
        });
      },
    );
  });
});
