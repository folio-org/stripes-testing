import moment from 'moment';

import { ORDER_EXPORT_CSV_FIELDS, ORDER_LINE_EXPORT_CSV_FIELDS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { formatDateTime } from '../../../support/utils/acquisitions';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Export', () => {
    const orderFieldsToExport = [
      ORDER_EXPORT_CSV_FIELDS.PO_NUMBER,
      ORDER_EXPORT_CSV_FIELDS.CREATED_BY,
      ORDER_EXPORT_CSV_FIELDS.DATE_CREATED,
      ORDER_EXPORT_CSV_FIELDS.UPDATED_BY,
      ORDER_EXPORT_CSV_FIELDS.DATE_UPDATED,
    ];
    const orderLineFieldsToExport = [
      ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_NUMBER,
      ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_CREATED_BY,
      ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_CREATED,
      ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_UPDATED_BY,
      ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_UPDATED,
    ];
    const users = {};
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      exportedFileName: `order-export-${moment().format('YYYY-MM-DD')}-*`,
      firstPoLineTitle: `AT_C466136_FolioInstance_FirstPoLine_${getRandomPostfix()}`,
      secondPoLineTitle: `AT_C466136_FolioInstance_SecondPoLine_${getRandomPostfix()}`,
      order: {},
      firstPoLine: {},
      secondPoLine: {},
      adminUser: {},
      locale: {},
    };

    const editOrderViaApi = (orderId, note) => {
      // Exclude embedded PO lines from the payload so only the Order itself is updated
      Orders.getOrderByIdViaApi(orderId).then(({ poLines: _poLines, ...order }) => {
        Orders.updateOrderViaApi({ ...order, notes: [note] });
      });
    };

    const editPoLineViaApi = (poLineId, description) => {
      OrderLines.getOrderLineByIdViaApi(poLineId).then((poLine) => {
        OrderLines.updateOrderLineViaApi({ ...poLine, poLineDescription: description });
      });
    };

    const verifyPoLineRowInExportedFile = (poLine, poLineUpdatedBy) => {
      Orders.verifyHeaderAndValuesInCsvFileByIdentifier(
        testData.exportedFileName,
        ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_NUMBER,
        poLine.poLineNumber,
        [
          {
            header: ORDER_EXPORT_CSV_FIELDS.PO_NUMBER,
            value: Number(testData.order.poNumber),
          },
          {
            header: ORDER_EXPORT_CSV_FIELDS.CREATED_BY,
            value: testData.adminUser.username,
          },
          {
            header: ORDER_EXPORT_CSV_FIELDS.DATE_CREATED,
            value: formatDateTime(testData.locale, testData.order.metadata.createdDate),
          },
          {
            header: ORDER_EXPORT_CSV_FIELDS.UPDATED_BY,
            value: users.testUser.username,
          },
          {
            header: ORDER_EXPORT_CSV_FIELDS.DATE_UPDATED,
            value: formatDateTime(testData.locale, testData.order.metadata.updatedDate),
          },
          {
            header: ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_CREATED_BY,
            value: testData.adminUser.username,
          },
          {
            header: ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_CREATED,
            value: formatDateTime(testData.locale, poLine.metadata.createdDate),
          },
          {
            header: ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_UPDATED_BY,
            value: poLineUpdatedBy,
          },
          {
            header: ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_DATE_UPDATED,
            value: formatDateTime(testData.locale, poLine.metadata.updatedDate),
          },
        ],
      );
    };

    const verifyExportedFileContent = () => {
      // File contains 2 records (according to number of POLs in Order)
      Orders.verifyCSVFileRecordsNumber(testData.exportedFileName, 2);
      // "POL #1" row: POL was updated by test user
      verifyPoLineRowInExportedFile(testData.firstPoLine, users.testUser.username);
      // "POL #2" row: POL was updated by admin user only
      verifyPoLineRowInExportedFile(testData.secondPoLine, testData.adminUser.username);
    };

    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getAdminUserDetails().then((adminUser) => {
        testData.adminUser = adminUser;
      });
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });
      Organizations.createOrganizationViaApi(testData.organization);

      // Admin user creates an Order with two PO lines
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        BasicOrderLine.getDefaultOrderLine({ title: testData.firstPoLineTitle }),
      ).then((order) => {
        testData.order = order;

        OrderLines.getOrderLineViaApi({ query: `purchaseOrderId==${order.id}` }).then((poLines) => {
          testData.firstPoLine = poLines[0];

          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              title: testData.secondPoLineTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.firstPoLine.acquisitionMethod,
            }),
          ).then((poLine) => {
            testData.secondPoLine = poLine;
          });
        });
      });

      cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiExportOrders.gui]).then(
        (userProperties) => {
          users.testUser = userProperties;

          // Test user edits Order and only "POL #1"
          cy.getUserToken(users.testUser.username, users.testUser.password).then(() => {
            editOrderViaApi(testData.order.id, `AT_C466136_Note_${getRandomPostfix()}`);
            editPoLineViaApi(
              testData.firstPoLine.id,
              `AT_C466136_Description_${getRandomPostfix()}`,
            );
          });

          // Get actual metadata of Order and PO lines after editing
          cy.getAdminToken();
          Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
            testData.order = order;
          });
          OrderLines.getOrderLineByIdViaApi(testData.firstPoLine.id).then((poLine) => {
            testData.firstPoLine = poLine;
          });
          OrderLines.getOrderLineByIdViaApi(testData.secondPoLine.id).then((poLine) => {
            testData.secondPoLine = poLine;
          });

          cy.login(users.testUser.username, users.testUser.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(`${testData.exportedFileName}.csv`);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(users.testUser.userId);
    });

    it(
      'C466136 .csv export file contains Updated by , Created by,  Date created,  Date updated columns both for Orders and PO lines from "Orders" and "Order lines" toggle (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C466136'] },
      () => {
        // Step 1: Perform search to retrieve only order from Preconditions
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.checkSearchResults(testData.order.poNumber);

        // Step 2: Click "Actions" button on "Orders" pane and select "Export results (CSV)" option
        const ExportSettingsModal = Orders.clickExportResultsToCsvButton();

        // Step 3: Click radio-button next to empty dropdown below "PO fields to export" label
        ExportSettingsModal.checkExportSelectedPoFieldsRadioButton();
        ExportSettingsModal.verifyPoFieldsDropdownDisabled(false);
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 4: Select "PO number", "Created by", "Created on", "Updated by", "Updated on"
        // fields in the dropdown below "PO fields to export" label
        orderFieldsToExport.forEach((field) => {
          ExportSettingsModal.selectOrderFieldsToExport(field);
        });
        ExportSettingsModal.verifySelectedPoFields(orderFieldsToExport);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 5: Click radio-button next to empty dropdown below "POL fields to export" label
        ExportSettingsModal.checkExportSelectedPolFieldsRadioButton();
        ExportSettingsModal.verifyPolFieldsDropdownDisabled(false);
        ExportSettingsModal.verifyExportButtonDisabled();

        // Step 6: Select "POLine number", "Created by (POL)", "Created on (POL)",
        // "Updated by (POL)", "Updated on (POL)" fields below "POL fields to export" label
        orderLineFieldsToExport.forEach((field) => {
          ExportSettingsModal.selectOrderLineFieldsToExport(field);
        });
        ExportSettingsModal.verifySelectedPolFields(orderLineFieldsToExport);
        ExportSettingsModal.verifyExportButtonDisabled(false);

        // Step 7: Click "Export" button
        ExportSettingsModal.clickExportButton();

        // Step 8: Open downloaded file and check its content
        verifyExportedFileContent();

        // remove earlier downloaded file
        FileManager.deleteFileFromDownloadsByMask(`${testData.exportedFileName}.csv`);

        // Step 9: Click "Order lines" toggle and perform search to retrieve only order lines
        // for Order from Preconditions
        Orders.selectOrderLines();
        OrderLines.waitLoading();
        OrderLines.searchByParameter('Keyword', `${testData.order.poNumber}*`);
        OrderLines.waitResultsListLoading();
        OrderLines.assertResultsCount(2);
        OrderLines.verifyOrderLineInResultsList(testData.firstPoLine.poLineNumber);
        OrderLines.verifyOrderLineInResultsList(testData.secondPoLine.poLineNumber);

        // Step 10: Click "Actions" button on "Order lines" pane and select
        // "Export results (CSV)" option
        Orders.clickExportResultsToCsvButton();

        // Step 11: Leave "All" options selected by default and click "Export" button
        ExportSettingsModal.clickExportButton();

        // Step 12: Open downloaded file and check its content
        verifyExportedFileContent();
      },
    );
  });
});
