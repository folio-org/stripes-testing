import moment from 'moment';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Receivings } from '../../../support/fragments/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Receiving', () => {
  const testData = {
    fileName: `receiving-export-${moment().format('YYYY-MM-DD')}-*.csv`,
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  const createOrder = ({ organization, workflowStatus }) => {
    testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: organization.id });
    testData.orderLine = BasicOrderLine.getDefaultOrderLine();

    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      if (workflowStatus !== 'Pending') {
        Orders.updateOrderViaApi({ ...testData.order, workflowStatus });
      }
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);
    });

    cy.createTempUser([
      Permissions.uiReceivingExportSearchResults.gui,
      Permissions.uiReceivingView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  afterEach('Delete file from downloads', () => {
    FileManager.deleteFileFromDownloadsByMask(testData.fileName);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  describe('Export', () => {
    const titleFields = [
      'Title',
      'Publisher',
      'Published date',
      'Edition',
      'Subscription from',
      'Subscription to',
      'Contributors',
      'Product IDs',
      'Order type',
      'Vendor',
      'Requester',
      'Rush',
      'Created by',
      'Date created',
      'Updated by',
      'Date updated',
    ];
    const pieceFields = [
      'Display summary',
      'Copy number',
      'Enumeration',
      'Chronology',
      'Barcode',
      'Call number',
      'Piece format',
      'Expected receipt date',
      'Comment',
      'Location',
      'Supplement',
      'Display on holding',
      'Item HRID',
      'Receiving status',
      'Internal note',
      'External note',
      'Created by (Piece)',
      'Date created (Piece)',
      'Updated by (Piece)',
      'Date updated (Piece)',
    ];

    before('Create test order', () => {
      cy.getAdminToken();
      createOrder({ organization: testData.organization, workflowStatus: 'Open' });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
    });

    it(
      'C353981 Export results (CSV) from Receiving for all "Title fields" and all "Piece fields" (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353981'] },
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
          const fields = [...titleFields, ...pieceFields];

          data.forEach((receive) => {
            cy.expect(Object.keys(receive).length).to.equal(fields.length);
          });
        });
      },
    );
  });

  describe('Export', () => {
    const titleFields = ['Title', 'Publisher'];
    const pieceFields = ['Display summary', 'Copy number'];

    before('Create test order', () => {
      cy.getAdminToken();
      createOrder({ organization: testData.organization, workflowStatus: 'Pending' });
      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receivings.waitLoading,
        });
      }, 20_000);
    });

    it(
      'C353985 Export results (CSV) from Receiving with specified "Title fields" and "Piece fields" (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353985'] },
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

        ExportSettingsModal.selectTitleFieldsToExport(titleFields);

        ExportSettingsModal.selectPieceFieldsToExport(pieceFields);

        // Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Open downloaded file, Check "Title fields" and "Piece fields" results are present
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          const fields = [...titleFields, ...pieceFields];

          data.forEach((receive) => {
            cy.expect(Object.keys(receive).length).to.equal(fields.length);
            fields.forEach((field) => cy.expect(receive[field]).to.not.be.undefined);
          });
        });
      },
    );
  });
});
