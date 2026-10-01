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
import ListsFile, { convertToCsvHeaders } from '../../../support/fragments/lists/lists-file';
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
import { PURCHASE_ORDER_LINES_FIELDS } from '../../../support/constants/query-builder/purchaseOrderLinesFields';
import DateTools from '../../../support/utils/dateTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderDetails from '../../../support/fragments/orders/orderDetails';

const PURCHASE_ORDER_LINES_CSV_FIELDS = convertToCsvHeaders(PURCHASE_ORDER_LINES_FIELDS);

let userData = {};
let adminUser = {};
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const todayDateInFile = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const recordType = Lists.recordTypes.purchaseOrderLines;
const testData = {
  vendor: NewOrganization.getDefaultOrganization({ isVendor: true }),
  order: {},
  orderLine: {},
  acquisitionMethodId: null,
  customFields: {
    checkbox: {
      ...generateCheckboxCustomFieldData({
        testNumber: 'C656252',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      name: `AT_C656252_'CB'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656252_'CB'_UPDATED_${randomFourDigitNumber()}`,
      testValue: true,
    },
    radioButton: {
      ...generateRadioButtonCustomFieldData({
        testNumber: 'C656252',
        data: {
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE,
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
      name: `AT_C656252_'RB'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656252_'RB'_UPDATED_${randomFourDigitNumber()}`,
    },
    singleSelect: {
      ...generateSingleSelectCustomFieldData({
        testNumber: 'C656252',
        data: {
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE,
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
      name: `AT_C656252_'SS'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656252_'SS'_UPDATED_${randomFourDigitNumber()}`,
    },
    textArea: {
      ...generateTextAreaCustomFieldData({
        testNumber: 'C656252',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      testValue: 'Text area test value',
      name: `AT_C656252_'TA'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656252_'TA'_UPDATED_${randomFourDigitNumber()}`,
    },
    textField: {
      ...generateTextFieldCustomFieldData({
        testNumber: 'C656252',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      testValue: 'Text field test value',
      name: `AT_C656252_'TF'_${randomFourDigitNumber()}`,
      updatedName: `AT_C656252_'TF'_UPDATED_${randomFourDigitNumber()}`,
    },
  },
  listName: getTestEntityValue('C656252_List'),
  exportedOrderFileName: `order-export-${moment().format('YYYY-MM-DD')}-*`,
};

describe('Orders', () => {
  describe('Setting', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      cy.getAdminUserDetails().then((userDetails) => {
        adminUser = userDetails;
      });

      cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((amResp) => {
        testData.acquisitionMethodId = amResp.body.acquisitionMethods[0].id;
      });

      Organizations.createOrganizationViaApi(testData.vendor).then((id) => {
        testData.vendor.id = id;
      });

      const customFieldsArray = Object.values(testData.customFields).map(
        ({ testValue, testValueDisplay, updatedName, ...fieldData }) => fieldData,
      );

      cy.createCustomFieldsViaApi(customFieldsArray, CUSTOM_FIELD_ENTITY_TYPES.PO_LINE).then(
        (createdFields) => {
          createdFields.forEach((field) => {
            const key = Object.keys(testData.customFields).find(
              (k) => testData.customFields[k].name === field.name,
            );
            if (key) {
              testData.customFields[key] = {
                ...testData.customFields[key],
                ...field,
                label: `POL — ${field.name}`,
                updatedLabel: `POL — ${testData.customFields[key].updatedName}`,
              };
            }
          });

          const order = {
            ...NewOrder.getDefaultOrder({
              vendorId: testData.vendor.id,
              orderType: 'One-Time',
            }),
            approved: true,
          };

          Orders.createOrderViaApi(order).then((createdOrder) => {
            testData.order = createdOrder;

            const orderLine = {
              ...BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: createdOrder.id,
                acquisitionMethod: testData.acquisitionMethodId,
              }),
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

            OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
              testData.orderLine = createdOrderLine;
            });
          });

          Object.values(testData.customFields).forEach((cf) => {
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
              CUSTOM_FIELD_ENTITY_TYPES.PO_LINE,
            );
          });

          cy.wrap(Object.values(testData.customFields)).each((cf) => {
            Lists.waitForCustomFieldToBeQueryable(cf.updatedLabel, recordType);
          });
        },
      );

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
      cy.getAdminToken(false);
      Lists.deleteListByNameViaApi(testData.listName);
      if (testData.orderLine?.id) {
        OrderLines.deleteOrderLineViaApi(testData.orderLine.id);
      }
      if (testData.order?.id) {
        Orders.deleteOrderViaApi(testData.order.id);
      }
      if (testData.vendor?.id) {
        Organizations.deleteOrganizationViaApi(testData.vendor.id);
      }
      const customFieldIds = Object.values(testData.customFields)
        .filter((cf) => cf.id)
        .map((cf) => cf.id);
      if (customFieldIds.length > 0) {
        cy.deleteCustomFieldsViaApi({
          ids: customFieldIds,
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE,
        });
      }
      if (userData.userId) {
        Users.deleteViaApi(userData.userId);
      }
      Lists.deleteDownloadedFile(testData.listName);
      FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);
    });

    it(
      'C656252 Verify search by updated custom order line fields in Lists app and export custom fields .csv (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C656252'] },
      () => {
        // Step 1: Verify updated custom field names in PO Line details pane
        cy.login(userData.username, userData.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList();
        OrderLines.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        // Verify all custom fields have updated names and values
        OrderLineDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.checkbox.updatedName,
          testData.customFields.checkbox.testValue,
          true,
        );
        OrderLineDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.radioButton.updatedName,
          testData.customFields.radioButton.testValueDisplay,
        );
        OrderLineDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.singleSelect.updatedName,
          testData.customFields.singleSelect.testValueDisplay,
        );
        OrderLineDetails.verifyValuesInCustomFieldsAccordion(
          testData.customFields.textArea.updatedName,
          testData.customFields.textArea.testValue,
        );
        OrderLineDetails.verifyValuesInCustomFieldsAccordion(
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
        QueryModal.verify();

        // Step 3: Test Checkbox custom field with UPDATED name
        QueryModal.selectField(testData.customFields.checkbox.updatedLabel);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(1);
        QueryModal.verifyColumnDisplayed(testData.customFields.checkbox.updatedLabel);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.poLineNumber,
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
          testData.orderLine.poLineNumber,
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
          testData.orderLine.poLineNumber,
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
          testData.orderLine.poLineNumber,
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
          testData.orderLine.poLineNumber,
          testData.customFields.textField.updatedLabel,
          testData.customFields.textField.testValue,
        );
        QueryModal.scrollResultTable('left');

        const headerValuesToVerifyOnUI = [
          {
            header: `POL — ${testData.customFields.checkbox.updatedName}`,
            value: 'True',
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.POL.PO_LINE_NUMBER,
            value: testData.orderLine.poLineNumber,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.POL.TITLE_OR_PACKAGE,
            value: testData.orderLine.titleOrPackage,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.POL.UUID,
            value: testData.orderLine.id,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.APPROVED,
            value: 'True',
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.DATE_ORDERED,
            value: '',
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.ORDER_TYPE,
            value: testData.order.orderType,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.PO_NUMBER,
            value: testData.order.poNumber,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.UPDATED_AT,
            value: todayDate,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.POL.UPDATED_AT,
            value: todayDate,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.PO.WORKFLOW_STATUS,
            value: testData.order.workflowStatus,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.VENDOR_ORG.CODE,
            value: testData.vendor.code,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.VENDOR_ORG.NAME,
            value: testData.vendor.name,
          },
          {
            header: PURCHASE_ORDER_LINES_FIELDS.VENDOR_ORG.STATUS,
            value: testData.vendor.status,
          },
          {
            header: `POL — ${testData.customFields.radioButton.updatedName}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `POL — ${testData.customFields.singleSelect.updatedName}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `POL — ${testData.customFields.textArea.updatedName}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `POL — ${testData.customFields.textField.updatedName}`,
            value: testData.customFields.textField.testValue,
          },
        ];

        QueryModal.verifyMatchedRecordInMultipleColumnsByIdentifier(
          testData.orderLine.poLineNumber,
          headerValuesToVerifyOnUI,
        );

        // Step 5: Run query & save, then export selected columns
        QueryModal.clickRunQueryAndSave();
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportListVisibleColumns();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Step 6: Verify exported CSV contains all fields columns
        const headerValuesToVerifyInFile = [
          {
            header: `POL - ${testData.customFields.checkbox.updatedName}`,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: `POL - ${testData.customFields.radioButton.updatedName}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `POL - ${testData.customFields.singleSelect.updatedName}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `POL - ${testData.customFields.textArea.updatedName}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `POL - ${testData.customFields.textField.updatedName}`,
            value: testData.customFields.textField.testValue,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PO_LINE_NUMBER,
            value: testData.orderLine.poLineNumber,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.TITLE_OR_PACKAGE,
            value: testData.orderLine.titleOrPackage,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.UPDATED_AT,
            value: todayDateInFile,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.UUID,
            value: testData.orderLine.id,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.APPROVED,
            value: true,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.DATE_ORDERED,
            value: '',
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.ORDER_TYPE,
            value: testData.order.orderType,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.PO_NUMBER,
            value: Number(testData.order.poNumber),
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.UPDATED_AT,
            value: todayDateInFile,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.WORKFLOW_STATUS,
            value: testData.order.workflowStatus,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.CODE,
            value: testData.vendor.code,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.NAME,
            value: testData.vendor.name,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.STATUS,
            value: testData.vendor.status,
          },
        ];

        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.listName,
          PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PO_LINE_NUMBER,
          testData.orderLine.poLineNumber,
          headerValuesToVerifyInFile,
        );

        const expectedHeaders = headerValuesToVerifyInFile
          .map((item) => `"${item.header}"`)
          .join(',');
        ExportFile.verifyFileIncludes(`${testData.listName}.csv`, [expectedHeaders]);

        // Remove earlier downloaded file
        Lists.deleteDownloadedFile(testData.listName);

        // Step 7-8: Export all columns and verify
        Lists.openActions();
        Lists.exportList();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Verify all columns in exported CSV
        const headerValuesToVerifyAllColumns = [
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.EXCHANGE_RATE, value: 1 },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.ACQUISITION_METHOD, value: 'Other' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.AGREEMENT_UUID, value: '' },
          ...headerValuesToVerifyInFile.slice(0, 5),
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_CURRENCY, value: 'USD' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_EXCHANGE_RATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_PO_LINE_ESTIMATED_PRICE, value: 1 },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.CREATED_AT, value: todayDateInFile },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DESCRIPTION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DETAILS_RECEIVING_NOTE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DONOR, value: '' },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_CREATE_INVENTORY,
            value: 'None',
          },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_EXPECTED_ACTIVATION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_IS_ACTIVATED, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_IS_TRIAL, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_RESOURCE_URL, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.FUND_DISTRIBUTION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.IS_RUSH, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.LOCATIONS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.MEMBERSHIP, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.MULTI_YEAR_PREPAYMENT, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.ORDER_FORMAT, value: 'Other' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PAYMENT_STATUS, value: 'Pending' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PAYMENT_TERMS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PHYSICAL_EXPECTED_RECEIPT_DATE, value: '' },
          ...headerValuesToVerifyInFile.slice(5, 9),
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PREPAYMENT_TERM, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PUBLICATION_DATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PUBLISHER, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.RECEIPT_DATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.RECEIPT_STATUS, value: 'Pending' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.SELECTOR, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.SOURCE, value: 'User' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.STARTING_FISCAL_YEAR, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.TAGS, value: '' },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_CREATED_BY.EMAIL,
            value: adminUser.personal.email,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_CREATED_BY.LAST_NAME_FIRST_NAME,
            value: `${adminUser.personal.lastName}, ${adminUser.personal.firstName}`,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_CREATED_BY.USERNAME,
            value: adminUser.username,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_UPDATED_BY.EMAIL,
            value: adminUser.personal.email,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_UPDATED_BY.LAST_NAME_FIRST_NAME,
            value: `${adminUser.personal.lastName}, ${adminUser.personal.firstName}`,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL_UPDATED_BY.USERNAME,
            value: adminUser.username,
          },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.EXCHANGE_RATE.CURRENCY, value: 'USD' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.EXCHANGE_RATE.RATE, value: 1 },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.ACQUISITION_UNIT_NAMES, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.ACQUISITION_UNIT_UUIDS, value: '' },
          ...headerValuesToVerifyInFile.slice(9, 15),
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.CLOSE_REASON, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.CREATED_AT, value: todayDateInFile },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.EXTERNAL_ORDER_NUMBER, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.RE_ENCUMBER, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.TAGS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.UUID, value: testData.order.id },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_ASSIGNED_TO_USER.EMAIL, value: '' },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_ASSIGNED_TO_USER.LAST_NAME_FIRST_NAME,
            value: '',
          },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_ASSIGNED_TO_USER.USERNAME, value: '' },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_CREATED_BY.EMAIL,
            value: adminUser.personal.email,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_CREATED_BY.LAST_NAME_FIRST_NAME,
            value: `${adminUser.personal.lastName}, ${adminUser.personal.firstName}`,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_CREATED_BY.USERNAME,
            value: adminUser.username,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_UPDATED_BY.EMAIL,
            value: adminUser.personal.email,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_UPDATED_BY.LAST_NAME_FIRST_NAME,
            value: `${adminUser.personal.lastName}, ${adminUser.personal.firstName}`,
          },
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO_UPDATED_BY.USERNAME,
            value: adminUser.username,
          },
          ...headerValuesToVerifyInFile.slice(15, 18),
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.EDI_VENDOR_CODE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.EDI_VENDOR_TYPE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.IS_DONOR, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.IS_VENDOR, value: true },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.TAGS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.VENDOR_ORG.UUID, value: testData.vendor.id },
        ];

        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          testData.listName,
          PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PO_LINE_NUMBER,
          testData.orderLine.poLineNumber,
          headerValuesToVerifyAllColumns,
        );

        // Step 9-11: Export from Orders app with "All" fields selected
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.resetFilters();
        Orders.waitLoading();
        OrderLineDetails.backToOrderDetails();
        OrderDetails.closeOrderDetails();
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order and Order Line field options before exporting
        ExportSettingsModal.getAllOrderFieldOptions().then((allOrderFieldOptions) => {
          ExportSettingsModal.checkExportAllPoFieldsRadioButton();
          ExportSettingsModal.getAllOrderLineFieldOptions().then((allOrderLineFieldOptions) => {
            ExportSettingsModal.checkExportAllPolFieldsRadioButton();
            // Step 10: Leave "All" options selected by default
            ExportSettingsModal.clickExportButton();
            InteractorsTools.checkCalloutMessage(OrderStates.exportJobStartedSuccessfully);

            // Step 11: Verify exported file contains all PO and POL columns with all custom fields
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
              'PO number',
              Number(testData.order.poNumber),
              headerValuesToVerifyInOrderFile,
            );

            const allOrderFieldNames = allOrderFieldOptions.map((opt) => {
              return opt.replace('Custom fields - ', '').replace(/\+$/, '');
            });

            const allOrderLineFieldNames = allOrderLineFieldOptions.map((opt) => {
              return opt.replace('Custom fields - ', '').replace(/\+$/, '');
            });

            // Verify ALL PO fields are present in the exported CSV
            Orders.verifyColumnHeaderExistsInCsvFile(
              testData.exportedOrderFileName,
              allOrderFieldNames,
              true,
            );

            // Verify ALL POL fields are present in the exported CSV
            Orders.verifyColumnHeaderExistsInCsvFile(
              testData.exportedOrderFileName,
              allOrderLineFieldNames,
              true,
            );
          });
        });

        // remove earlier downloaded file
        FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);

        // Step 12-14: Export from Order lines with selected custom POL fields
        Orders.selectOrderLines();
        OrderLines.waitLoading();
        OrderLines.searchByParameter('Keyword', `${testData.order.poNumber}-1`);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order and Order Line field options
        ExportSettingsModal.getAllOrderFieldOptions().then((allOrderFieldOptions) => {
          ExportSettingsModal.checkExportAllPoFieldsRadioButton();
          ExportSettingsModal.getAllOrderLineFieldOptions().then((allOrderLineFieldOptions) => {
            const polFieldsToExport = [
              `Custom fields - ${testData.customFields.checkbox.updatedName}`,
              `Custom fields - ${testData.customFields.radioButton.updatedName}`,
              `Custom fields - ${testData.customFields.singleSelect.updatedName}`,
              `Custom fields - ${testData.customFields.textArea.updatedName}`,
              `Custom fields - ${testData.customFields.textField.updatedName}`,
            ];

            // Step 13: Select custom fields from POL fields dropdown
            polFieldsToExport.forEach((field) => {
              ExportSettingsModal.selectOrderLineFieldsToExport(field);
            });

            ExportSettingsModal.clickExportButton();

            // Step 14: Verify exported file contains all PO columns and only selected POL custom field columns
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
              'PO number',
              Number(testData.order.poNumber),
              headerValuesToVerifyInOrderLineFile,
            );

            const allOrderFieldNames = allOrderFieldOptions.map((opt) => {
              return opt.replace('Custom fields - ', '').replace(/\+$/, '');
            });

            const unselectedOrderLineFields = allOrderLineFieldOptions.filter((opt) => {
              const normalizedOpt = opt.replace(/\+$/, '');
              return !polFieldsToExport.includes(normalizedOpt);
            });

            const unselectedOrderLineFieldNames = unselectedOrderLineFields.map((opt) => {
              return opt.replace('Custom fields - ', '').replace(/\+$/, '');
            });

            // Verify ALL PO fields are present in the exported CSV
            Orders.verifyColumnHeaderExistsInCsvFile(
              testData.exportedOrderFileName,
              allOrderFieldNames,
              true,
            );

            // Verify ALL unselected Order Line fields are absent from the exported CSV
            Orders.verifyColumnHeaderExistsInCsvFile(
              testData.exportedOrderFileName,
              unselectedOrderLineFieldNames,
              false,
            );
          });
        });
      },
    );
  });
});
