import moment from 'moment';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { ORDER_STATUSES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Export', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      renewalNote: `autotest_renewal_note_${getRandomPostfix()}`,
      fileName: `order-export-${moment().format('YYYY-MM-DD')}-*.csv`,
      order: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            renewalNote: testData.renewalNote,
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });
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
        Orders.deleteOrderViaApi(testData.order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353977 "Renewal note"  field is added to .csv export file (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353977'] },
      () => {
        // Search for the order from Preconditions
        Orders.searchByParameter('PO number', testData.order.poNumber);

        // Click "Actions" button on "Orders" pane and select "Export results (CSV)" option
        const ExportSettingsModal = Orders.clickExportResultsToCsvButton();

        // Click radio button to activate "POL fields to export" dropdown field
        ExportSettingsModal.selectOrderLineFieldsToExport('Renewal note');

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Renewal note" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((order) => {
            cy.expect(order['Renewal note']).to.equal(testData.renewalNote);
          });
        });

        // Search for the order from Preconditions
        Orders.searchByParameter('PO number', testData.order.poNumber);

        // Click "Actions" button on "Orders" pane and select "Export results (CSV)" option
        Orders.clickExportResultsToCsvButton();

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Renewal note" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((order) => {
            cy.expect(order['Renewal note']).to.equal(testData.renewalNote);
          });
        });
      },
    );
  });
});
