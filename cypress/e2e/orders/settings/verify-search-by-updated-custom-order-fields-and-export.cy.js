/* eslint-disable no-unused-vars */
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
import OrderDetails from '../../../support/fragments/orders/orderDetails';

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
        testNumber: 'C656251',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      name: `AT_C656251_'CB'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656251_'CB'_UPDATED_${randomFourDigitNumber()}`,
      testValue: true,
    },
    radioButton: {
      ...generateRadioButtonCustomFieldData({
        testNumber: 'C656251',
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
      name: `AT_C656251_'RB'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656251_'RB'_UPDATED_${randomFourDigitNumber()}`,
    },
    singleSelect: {
      ...generateSingleSelectCustomFieldData({
        testNumber: 'C656251',
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
      name: `AT_C656251_'SS'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656251_'SS'_UPDATED_${randomFourDigitNumber()}`,
    },
    textArea: {
      ...generateTextAreaCustomFieldData({
        testNumber: 'C656251',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      testValue: 'Text area test value',
      name: `AT_C656251_'TA'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656251_'TA'_UPDATED_${randomFourDigitNumber()}`,
    },
    textField: {
      ...generateTextFieldCustomFieldData({
        testNumber: 'C656251',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
      }),
      testValue: 'Text field test value',
      name: `AT_C656251_'TF'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656251_'TF'_UPDATED_${randomFourDigitNumber()}`,
    },
  },
  listName: getTestEntityValue('C656251_List'),
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
        ({ testValue, testValueDisplay, updatedName, ...fieldData }) => fieldData,
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
                updatedLabel: `PO — ${testData.customFields[key].updatedName}`,
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

          // Update custom field names using replaceCustomFieldViaApi
          Object.values(testData.customFields).forEach((cf) => {
            // Extract only API-valid fields
            const {
              testValue,
              testValueDisplay,
              updatedName,
              label,
              updatedLabel,
              ...apiValidFields
            } = cf;

            cy.replaceCustomFieldViaApi(
              {
                ...apiValidFields,
                name: updatedName,
              },
              CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
            );
          });

          // Wait for custom fields with updated names to be queryable
          cy.wrap(Object.values(testData.customFields)).each((cf) => {
            Lists.waitForCustomFieldToBeQueryable(cf.updatedLabel, recordType);
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
      FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C656251 Verify search by updated custom order fields in Lists app and export custom fields .csv (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C656251'] },
      () => {
        // Step 1: Verify updated custom field names in Purchase order pane
        cy.login(userData.username, userData.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList();
        // Verify all custom fields have updated names and values
        OrderDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.checkbox.updatedName,
          testData.customFields.checkbox.testValue,
          true,
        );
        OrderDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.radioButton.updatedName,
          testData.customFields.radioButton.testValueDisplay,
        );
        OrderDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.singleSelect.updatedName,
          testData.customFields.singleSelect.testValueDisplay,
        );
        OrderDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.textArea.updatedName,
          testData.customFields.textArea.testValue,
        );
        OrderDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.textField.updatedName,
          testData.customFields.textField.testValue,
        );

        // Step 2: Go to Lists app and create new list
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();

        // Step 3: Test Checkbox custom field
        QueryModal.selectField(testData.customFields.checkbox.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.verifyColumnDisplayed(testData.customFields.checkbox.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          testData.customFields.checkbox.updatedLabel,
          'True',
        );

        // Step 4: Test remaining custom fields (repeat step 3 for each)
        // Test Radio button sets
        QueryModal.selectField(testData.customFields.radioButton.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(testData.customFields.radioButton.testValueDisplay);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.radioButton.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          testData.customFields.radioButton.updatedLabel,
          testData.customFields.radioButton.testValueDisplay,
        );

        // Test Single select
        QueryModal.selectField(testData.customFields.singleSelect.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(testData.customFields.singleSelect.testValueDisplay);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.singleSelect.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          testData.customFields.singleSelect.updatedLabel,
          testData.customFields.singleSelect.testValueDisplay,
        );

        // Test Text area
        QueryModal.selectField(testData.customFields.textArea.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.customFields.textArea.testValue);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.textArea.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          testData.customFields.textArea.updatedLabel,
          testData.customFields.textArea.testValue,
        );

        // Test Text field
        QueryModal.selectField(testData.customFields.textField.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.customFields.textField.testValue);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.scrollResultTable('right');
        QueryModal.verifyColumnDisplayed(testData.customFields.textField.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          testData.customFields.textField.updatedLabel,
          testData.customFields.textField.testValue,
        );

        // Step 5: Run query & save, then export selected columns
        QueryModal.clickRunQueryAndSave();
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportListVisibleColumns();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Step 6: Verify exported CSV contains all custom fields

        const headerValuesToVerify = [
          {
            header: `PO - ${testData.customFields.checkbox.updatedName}`,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: `PO - ${testData.customFields.radioButton.updatedName}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `PO - ${testData.customFields.singleSelect.updatedName}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `PO - ${testData.customFields.textArea.updatedName}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `PO - ${testData.customFields.textField.updatedName}`,
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

        // Step 7-8: Export all columns and verify
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

        // Step 9-11: Export from Orders app with selected custom fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.resetFilters();
        Orders.waitLoading();
        OrderDetails.closeOrderDetails();
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order field options
        ExportSettingsModal.getAllOrderFieldOptions().then((allOrderFieldOptions) => {
          const orderFieldsToExport = [
            `Custom fields - ${testData.customFields.checkbox.updatedName}`,
            `Custom fields - ${testData.customFields.radioButton.updatedName}`,
            `Custom fields - ${testData.customFields.singleSelect.updatedName}`,
            `Custom fields - ${testData.customFields.textArea.updatedName}`,
            `Custom fields - ${testData.customFields.textField.updatedName}`,
          ];

          orderFieldsToExport.forEach((field) => {
            ExportSettingsModal.selectOrderFieldsToExport(field);
          });

          ExportSettingsModal.clickExportButton();

          const headerValuesToVerifyInOrderFile = [
            {
              header: testData.customFields.checkbox.updatedName,
              value: testData.customFields.checkbox.testValue,
            },
            {
              header: testData.customFields.radioButton.updatedName,
              value: testData.customFields.radioButton.testValueDisplay,
            },
            {
              header: testData.customFields.singleSelect.updatedName,
              value: testData.customFields.singleSelect.testValueDisplay,
            },
            {
              header: testData.customFields.textArea.updatedName,
              value: testData.customFields.textArea.testValue,
            },
            {
              header: testData.customFields.textField.updatedName,
              value: testData.customFields.textField.testValue,
            },
          ];

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

        // remove earlier downloaded file
        FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);

        // Step 12-14: Export from Order lines with all fields
        Orders.selectOrderLines();
        OrderLines.searchByParameter('Keyword', `${testData.order.poNumber}-1`);
        Orders.clickExportResultsToCsvButton();
        ExportSettingsModal.clickExportButton();
        InteractorsTools.checkCalloutMessage(OrderStates.exportJobStartedSuccessfully);

        const headerValuesToVerifyInOrderLineFile = [
          {
            header: testData.customFields.checkbox.updatedName,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: testData.customFields.radioButton.updatedName,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: testData.customFields.singleSelect.updatedName,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: testData.customFields.textArea.updatedName,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: testData.customFields.textField.updatedName,
            value: testData.customFields.textField.testValue,
          },
        ];

        Orders.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.exportedOrderFileName,
          'POLine number',
          testData.orderLine.poLineNumber,
          headerValuesToVerifyInOrderLineFile,
        );
      },
    );
  });
});
