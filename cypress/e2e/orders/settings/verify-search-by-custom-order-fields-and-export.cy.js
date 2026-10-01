import moment from 'moment';
import { APPLICATION_NAMES, CUSTOM_FIELD_ENTITY_TYPES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';
import ListsFile from '../../../support/fragments/lists/lists-file';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  generateCheckboxCustomFieldData,
  generateRadioButtonCustomFieldData,
  generateSingleSelectCustomFieldData,
  generateTextAreaCustomFieldData,
  generateTextFieldCustomFieldData,
} from '../../../support/utils/customFields';
import OrderStates from '../../../support/fragments/orders/orderStates';
import InteractorsTools from '../../../support/utils/interactorsTools';
import FileManager from '../../../support/utils/fileManager';
import ExportSettingsModal from '../../../support/fragments/orders/modals/exportSettingsModal';

let userData = {};
const recordType = Lists.recordTypes.purchaseOrderLines;
const testData = {
  vendor: NewOrganization.getDefaultOrganization({ isVendor: true }),
  order: {},
  orderLine: {},
  acquisitionMethodId: null,
  customFields: {
    checkbox: {
      ...generateCheckboxCustomFieldData({
        testNumber: 'C655290',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      name: `AT_C655290_'CB'_${randomFourDigitNumber()}`,
      testValue: true,
    },
    radioButton: {
      ...generateRadioButtonCustomFieldData({
        testNumber: 'C655290',
        data: {
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
          selectField: {
            multiSelect: false,
            options: {
              values: [
                { id: 'opt_0', value: 'Option 1', default: false },
                { id: 'opt_1', value: 'Option 2', default: false },
              ],
            },
          },
        },
      }),
      testValue: 'opt_0',
      testValueDisplay: 'Option 1',
      name: `AT_C655290_'RB'_${randomFourDigitNumber()}`,
    },
    singleSelect: {
      ...generateSingleSelectCustomFieldData({
        testNumber: 'C655290',
        data: {
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
          selectField: {
            multiSelect: false,
            options: {
              values: [
                { id: 'opt_0', value: 'Value A', default: false },
                { id: 'opt_1', value: 'Value B', default: false },
              ],
            },
          },
        },
      }),
      testValue: 'opt_0',
      testValueDisplay: 'Value A',
      name: `AT_C655290_'SS'_${randomFourDigitNumber()}`,
    },
    textArea: {
      ...generateTextAreaCustomFieldData({
        testNumber: 'C655290',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      testValue: 'Text area test value',
      name: `AT_C655290_'TA'_${randomFourDigitNumber()}`,
    },
    textField: {
      ...generateTextFieldCustomFieldData({
        testNumber: 'C655290',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      testValue: 'Text field test value',
      name: `AT_C655290_'TF'_${randomFourDigitNumber()}`,
    },
  },
  listName: getTestEntityValue('C655290_List'),
  exportedOrderFileName: `order-export-${moment().format('YYYY-MM-DD')}-*`,
};

describe('Orders', () => {
  describe('Setting', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Get acquisition method
      cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((amResp) => {
        testData.acquisitionMethodId = amResp.body.acquisitionMethods[0].id;
      });

      // Create vendor organization
      Organizations.createOrganizationViaApi(testData.vendor).then((id) => {
        testData.vendor.id = id;
      });

      // Create custom fields
      const customFieldsArray = Object.values(testData.customFields).map(
        // eslint-disable-next-line no-unused-vars
        ({ testValue, testValueDisplay, ...fieldData }) => fieldData,
      );

      cy.createCustomFieldsViaApi(customFieldsArray, CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER).then(
        (createdFields) => {
          // Map created fields back to testData by name and create labels
          createdFields.forEach((field) => {
            const key = Object.keys(testData.customFields).find(
              (k) => testData.customFields[k].name === field.name,
            );
            if (key) {
              testData.customFields[key] = {
                ...testData.customFields[key],
                ...field,
                label: `PO — ${field.name}`,
              };
            }
          });

          // Create order with custom fields
          const order = {
            ...NewOrder.getDefaultOrder({
              vendorId: testData.vendor.id,
              orderType: 'One-Time',
            }),
            approved: true,
            customFields: {
              [testData.customFields.checkbox.refId]: testData.customFields.checkbox.testValue,
              [testData.customFields.radioButton.refId]:
                testData.customFields.radioButton.testValue,
              [testData.customFields.singleSelect.refId]:
                testData.customFields.singleSelect.testValue,
              [testData.customFields.textArea.refId]: testData.customFields.textArea.testValue,
              [testData.customFields.textField.refId]: testData.customFields.textField.testValue,
            },
          };

          Orders.createOrderViaApi(order).then((createdOrder) => {
            testData.order = createdOrder;

            // Create order line
            const orderLine = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: createdOrder.id,
              acquisitionMethod: testData.acquisitionMethodId,
            });

            OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
              testData.orderLine = createdOrderLine;
            });
          });

          // Wait for custom fields to be queryable
          cy.wrap(Object.values(testData.customFields)).each((cf) => {
            Lists.waitForCustomFieldToBeQueryable(cf.label, recordType);
          });
        },
      );

      // Create user
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.listsExport.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiExportOrders.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(testData.listName);
      // Delete order line
      if (testData.orderLine?.id) {
        OrderLines.deleteOrderLineViaApi(testData.orderLine.id);
      }
      // Delete order
      if (testData.order?.id) {
        Orders.deleteOrderViaApi(testData.order.id);
      }
      // Delete vendor
      if (testData.vendor?.id) {
        Organizations.deleteOrganizationViaApi(testData.vendor.id);
      }
      // Delete custom fields
      const customFieldIds = Object.values(testData.customFields)
        .filter((cf) => cf.id)
        .map((cf) => cf.id);
      if (customFieldIds.length > 0) {
        cy.deleteCustomFieldsViaApi({
          ids: customFieldIds,
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
        });
      }
      // Delete user
      if (userData.userId) {
        Users.deleteViaApi(userData.userId);
      }
      Lists.deleteDownloadedFile(testData.listName);
      FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);
    });

    it(
      'C655290 Verify search by custom order fields in Lists app and export custom fields .csv (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C655290'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.filtersWaitLoading,
        });

        // Step 1: Create new list, select record type, and open Build query
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Test Checkbox custom field
        QueryModal.selectField(testData.customFields.checkbox.label);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.verifyColumnDisplayed(testData.customFields.checkbox.label);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
          testData.customFields.checkbox.label,
          'True',
        );

        // Step 3: Test remaining custom fields (repeat step 2 for each)
        // Test Radio button sets
        QueryModal.selectField(testData.customFields.radioButton.label);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(testData.customFields.radioButton.testValueDisplay);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.radioButton.label);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
          testData.customFields.radioButton.label,
          testData.customFields.radioButton.testValueDisplay,
        );

        // Test Single select
        QueryModal.selectField(testData.customFields.singleSelect.label);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(testData.customFields.singleSelect.testValueDisplay);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.singleSelect.label);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
          testData.customFields.singleSelect.label,
          testData.customFields.singleSelect.testValueDisplay,
        );

        // Test Text area
        QueryModal.selectField(testData.customFields.textArea.label);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.customFields.textArea.testValue);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.textArea.label);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
          testData.customFields.textArea.label,
          testData.customFields.textArea.testValue,
        );

        // Test Text field
        QueryModal.selectField(testData.customFields.textField.label);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.customFields.textField.testValue);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.textField.label);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
          testData.customFields.textField.label,
          testData.customFields.textField.testValue,
        );

        // Step 4: Run query & save, then export selected columns
        QueryModal.clickRunQueryAndSave();
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportListVisibleColumns();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Step 5: Verify exported CSV contains all custom fields

        const headerValuesToVerify = [
          {
            header: `PO - ${testData.customFields.checkbox.name}`,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: `PO - ${testData.customFields.radioButton.name}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `PO - ${testData.customFields.singleSelect.name}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `PO - ${testData.customFields.textArea.name}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `PO - ${testData.customFields.textField.name}`,
            value: testData.customFields.textField.testValue,
          },
        ];

        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.listName,
          'POL - PO line number',
          testData.orderLine.poLineNumber,
          headerValuesToVerify,
        );

        // Remove earlier downloaded file
        Lists.deleteDownloadedFile(testData.listName);

        // Step 6-7: Export all columns and verify
        Lists.openActions();
        Lists.exportList();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);
        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.listName,
          'POL - PO line number',
          testData.orderLine.poLineNumber,
          headerValuesToVerify,
        );

        // Step 8-10: Export from Orders app with all fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.exportResultsToCsv();
        InteractorsTools.checkCalloutMessage(OrderStates.exportJobStartedSuccessfully);

        const headerValuesToVerifyInOrderFile = [
          {
            header: testData.customFields.checkbox.name,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: testData.customFields.radioButton.name,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: testData.customFields.singleSelect.name,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: testData.customFields.textArea.name,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: testData.customFields.textField.name,
            value: testData.customFields.textField.testValue,
          },
        ];

        Orders.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.exportedOrderFileName,
          'POLine number',
          testData.orderLine.poLineNumber,
          headerValuesToVerifyInOrderFile,
        );

        // remove earlier downloaded file
        FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);

        // Step 11-13: Export from Order lines with selected custom fields
        Orders.selectOrderLines();
        OrderLines.searchByParameter('Keyword', `${testData.order.poNumber}-1`);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order field options
        ExportSettingsModal.getAllOrderFieldOptions().then((allOrderFieldOptions) => {
          const orderFieldsToExport = [
            `Custom fields - ${testData.customFields.checkbox.name}`,
            `Custom fields - ${testData.customFields.radioButton.name}`,
            `Custom fields - ${testData.customFields.singleSelect.name}`,
            `Custom fields - ${testData.customFields.textArea.name}`,
            `Custom fields - ${testData.customFields.textField.name}`,
          ];

          orderFieldsToExport.forEach((field) => {
            ExportSettingsModal.selectOrderFieldsToExport(field);
          });

          ExportSettingsModal.clickExportButton();
          Orders.verifyHeaderAndValuesInCsvFileByIdentifier(
            testData.exportedOrderFileName,
            'POLine number',
            testData.orderLine.poLineNumber,
            headerValuesToVerifyInOrderFile,
          );

          // Find ALL Order field options that were NOT selected (both custom and non-custom)
          // Need to normalize by removing trailing "+" for comparison
          const unselectedOrderFields = allOrderFieldOptions.filter((opt) => {
            const normalizedOpt = opt.replace(/\+$/, '');
            return !orderFieldsToExport.includes(normalizedOpt);
          });

          // Remove "Custom fields - " prefix and trailing "+" to get actual column names
          const unselectedOrderFieldNames = unselectedOrderFields.map((opt) => {
            return opt.replace('Custom fields - ', '').replace(/\+$/, '');
          });

          // Verify ALL unselected Order fields are absent from the exported CSV
          Orders.verifyColumnHeaderExistsInCsvFile(
            testData.exportedOrderFileName,
            unselectedOrderFieldNames,
            false,
          );
        });
      },
    );
  });
});
