import moment from 'moment';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Receivings } from '../../../support/fragments/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Receiving', () => {
  describe('Export', () => {
    const testData = {
      fileName: `receiving-export-${moment().format('YYYY-MM-DD')}-*.csv`,
      titleFields: [
        '"Title"',
        '"Publisher"',
        '"Published date"',
        '"Edition"',
        '"Subscription from"',
        '"Subscription to"',
        '"Contributors"',
        '"Product IDs"',
        '"Order type"',
        '"Vendor"',
        '"Requester"',
        '"Rush"',
      ],
      pieceFields: [
        '"Caption"',
        '"Copy number"',
        '"Enumeration"',
        '"Chronology"',
        '"Barcode"',
        '"Call number"',
        '"Piece format"',
        '"Expected receipt date"',
        '"Comment"',
        '"Location"',
        '"Supplement"',
        '"Display on holding"',
        '"Item HRID"',
      ],
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine();

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiReceivingExportSearchResults.gui,
        Permissions.uiReceivingView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receivings.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFileFromDownloadsByMask(testData.fileName);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353981 Export results (CSV) from Receiving for all "Title fields" and all "Piece fields" (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet'] },
      () => {
        // Click "Actions" button, Select "Export results (CSV)" option
        Receivings.expandActionsDropdown();
        Receivings.checkButtonsConditions([
          { label: 'Export results (CSV)', conditions: { disabled: true } },
        ]);

        // Search for selected title from Preconditions
        Receivings.searchByParameter({
          parameter: 'Title (Receiving titles)',
          value: testData.orderLine.titleOrPackage,
        });

        // Click "Actions" button, Select "Export results (CSV)" option
        const ExportSettingsModal = Receivings.clickExportResultsToCsvButton();

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Title fields" and "Piece fields" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          data.forEach((receive) => {
            [...testData.titleFields, ...testData.pieceFields].forEach(
              (field) => cy.expect(receive[`${field.replace(/\s/g, '')}`]).to.not.be.undefined,
            );
          });
        });
      },
    );
  });
});
