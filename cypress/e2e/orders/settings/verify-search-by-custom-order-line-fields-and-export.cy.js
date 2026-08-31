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

// Convert UI field names to CSV format (em dash → regular dash)
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
        testNumber: 'C655292',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      name: `AT_C655292_'CB'_${randomFourDigitNumber()}`,
      testValue: true,
    },
    radioButton: {
      ...generateRadioButtonCustomFieldData({
        testNumber: 'C655292',
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
      name: `AT_C655292_'RB'_${randomFourDigitNumber()}`,
    },
    singleSelect: {
      ...generateSingleSelectCustomFieldData({
        testNumber: 'C655292',
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
      name: `AT_C655292_'SS'_${randomFourDigitNumber()}`,
    },
    textArea: {
      ...generateTextAreaCustomFieldData({
        testNumber: 'C655292',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      testValue: 'Text area test value',
      name: `AT_C655292_'TA'_${randomFourDigitNumber()}`,
    },
    textField: {
      ...generateTextFieldCustomFieldData({
        testNumber: 'C655292',
        data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE },
      }),
      testValue: 'Text field test value',
      name: `AT_C655292_'TF'_${randomFourDigitNumber()}`,
    },
  },
  listName: getTestEntityValue('C655292_List'),
  exportedOrderFileName: `order-export-${moment().format('YYYY-MM-DD')}-*`,
};

describe('Orders', () => {
  describe('Setting', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Get admin user details
      cy.getAdminUserDetails().then((userDetails) => {
        adminUser = userDetails;
      });

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

      cy.createCustomFieldsViaApi(customFieldsArray, CUSTOM_FIELD_ENTITY_TYPES.PO_LINE).then(
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
                label: `POL — ${field.name}`,
              };
            }
          });

          // Create order
          const order = {
            ...NewOrder.getDefaultOrder({
              vendorId: testData.vendor.id,
              orderType: 'One-Time',
            }),
            approved: true,
          };

          Orders.createOrderViaApi(order).then((createdOrder) => {
            testData.order = createdOrder;

            // Create order line with custom fields
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
          entityType: CUSTOM_FIELD_ENTITY_TYPES.PO_LINE,
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
      'C655292 Verify search by custom order line fields in Lists app and export custom fields .csv (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C655292'] },
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
        QueryModal.scrollResultTable('left');

        const headerValuesToVerifyOnUI = [
          {
            header: `POL — ${testData.customFields.checkbox.name}`,
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
            header: `POL — ${testData.customFields.radioButton.name}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `POL — ${testData.customFields.singleSelect.name}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `POL — ${testData.customFields.textArea.name}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `POL — ${testData.customFields.textField.name}`,
            value: testData.customFields.textField.testValue,
          },
        ];

        QueryModal.verifyMatchedRecordInMultipleColumnsByIdentifier(
          testData.orderLine.poLineNumber,
          headerValuesToVerifyOnUI,
        );

        // Step 4: Run query & save, then export selected columns
        QueryModal.clickRunQueryAndSave();
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportListVisibleColumns();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Step 5: Verify exported CSV contains all fieldscolumns
        const headerValuesToVerifyInFile = [
          // Custom fields come first in CSV
          {
            header: `POL - ${testData.customFields.checkbox.name}`,
            value: testData.customFields.checkbox.testValue,
          },
          {
            header: `POL - ${testData.customFields.radioButton.name}`,
            value: testData.customFields.radioButton.testValueDisplay,
          },
          {
            header: `POL - ${testData.customFields.singleSelect.name}`,
            value: testData.customFields.singleSelect.testValueDisplay,
          },
          {
            header: `POL - ${testData.customFields.textArea.name}`,
            value: testData.customFields.textArea.testValue,
          },
          {
            header: `POL - ${testData.customFields.textField.name}`,
            value: testData.customFields.textField.testValue,
          },
          // POL fields
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
          // PO fields
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
          // Vendor org fields
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

        // Verify CSV header line contains all expected columns
        const expectedHeaders = headerValuesToVerifyInFile
          .map((item) => `"${item.header}"`)
          .join(',');
        ExportFile.verifyFileIncludes(`${testData.listName}.csv`, [expectedHeaders]);

        // Remove earlier downloaded file
        Lists.deleteDownloadedFile(testData.listName);

        // Step 6-7: Export all columns and verify
        Lists.openActions();
        Lists.exportList();
        Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
        Lists.verifyListExportedCalloutMessage(testData.listName);

        // Verify all columns in exported CSV
        const headerValuesToVerifyAllColumns = [
          // Exchange rate and acquisition
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.EXCHANGE_RATE, value: 1 },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.ACQUISITION_METHOD, value: 'Other' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.AGREEMENT_UUID, value: '' },
          // Custom fields
          ...headerValuesToVerifyInFile.slice(0, 5), // All 5 custom fields
          // Cost fields
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_CURRENCY, value: 'USD' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_EXCHANGE_RATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.COST_PO_LINE_ESTIMATED_PRICE, value: 1 },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.CREATED_AT, value: todayDateInFile },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DESCRIPTION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DETAILS_RECEIVING_NOTE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.DONOR, value: '' },
          // E-resource fields
          {
            header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_CREATE_INVENTORY,
            value: 'None',
          },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_EXPECTED_ACTIVATION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_IS_ACTIVATED, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_IS_TRIAL, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.E_RESOURCE_RESOURCE_URL, value: '' },
          // Fund and location
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.FUND_DISTRIBUTION, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.IS_RUSH, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.LOCATIONS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.MEMBERSHIP, value: '' },
          // Order format and payment
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.ORDER_FORMAT, value: 'Other' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PAYMENT_STATUS, value: 'Pending' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PHYSICAL_EXPECTED_RECEIPT_DATE, value: '' },
          ...headerValuesToVerifyInFile.slice(5, 9), // POL standard fields (PO line number, title, updated at, UUID)
          // Additional POL fields
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PUBLICATION_DATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.PUBLISHER, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.RECEIPT_DATE, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.RECEIPT_STATUS, value: 'Pending' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.SOURCE, value: 'User' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.POL.TAGS, value: '' },
          // POL user fields
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
          // Exchange rate
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.EXCHANGE_RATE.CURRENCY, value: 'USD' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.EXCHANGE_RATE.RATE, value: 1 },
          // PO fields
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.ACQUISITION_UNIT_NAMES, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.ACQUISITION_UNIT_UUIDS, value: '' },
          ...headerValuesToVerifyInFile.slice(9, 15), // PO standard fields (approved, date ordered, order type, PO number, updated at, workflow status)
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.CLOSE_REASON, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.CREATED_AT, value: todayDateInFile },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.EXTERNAL_ORDER_NUMBER, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.RE_ENCUMBER, value: false },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.TAGS, value: '' },
          { header: PURCHASE_ORDER_LINES_CSV_FIELDS.PO.UUID, value: testData.order.id },
          // PO user fields
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
          // Vendor org fields
          ...headerValuesToVerifyInFile.slice(15, 18), // Vendor org (code, name, status)
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

        // Step 8-10: Export from Orders app with selected custom POL fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order Line field options
        ExportSettingsModal.getAllOrderLineFieldOptions().then((allOrderLineFieldOptions) => {
          const polFieldsToExport = [
            `Custom fields - ${testData.customFields.checkbox.name}`,
            `Custom fields - ${testData.customFields.radioButton.name}`,
            `Custom fields - ${testData.customFields.singleSelect.name}`,
            `Custom fields - ${testData.customFields.textArea.name}`,
            `Custom fields - ${testData.customFields.textField.name}`,
          ];

          // Step 9: Select custom fields from POL fields dropdown
          polFieldsToExport.forEach((field) => {
            ExportSettingsModal.selectOrderLineFieldsToExport(field);
          });

          ExportSettingsModal.clickExportButton();

          // Step 10: Verify exported file contains all PO columns and only selected POL custom field columns
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
            'PO number',
            Number(testData.order.poNumber),
            headerValuesToVerifyInOrderFile,
          );

          // Find ALL Order Line field options that were NOT selected (both custom and non-custom)
          // Need to normalize by removing trailing "+" for comparison
          const unselectedOrderLineFields = allOrderLineFieldOptions.filter((opt) => {
            const normalizedOpt = opt.replace(/\+$/, '');
            return !polFieldsToExport.includes(normalizedOpt);
          });

          // Remove "Custom fields - " prefix and trailing "+" to get actual column names
          const unselectedOrderLineFieldNames = unselectedOrderLineFields.map((opt) => {
            return opt.replace('Custom fields - ', '').replace(/\+$/, '');
          });

          // Verify ALL unselected Order Line fields are absent from the exported CSV
          Orders.verifyColumnHeaderExistsInCsvFile(
            testData.exportedOrderFileName,
            unselectedOrderLineFieldNames,
            false,
          );
        });

        // remove earlier downloaded file
        FileManager.deleteFileFromDownloadsByMask(testData.exportedOrderFileName);

        // Step 11-13: Export from Order lines with all fields
        Orders.selectOrderLines();
        OrderLines.waitLoading();
        OrderLines.searchByParameter('Keyword', `${testData.order.poNumber}-1`);
        Orders.clickExportResultsToCsvButton();

        // Get all available Order and Order Line field options before exporting
        ExportSettingsModal.getAllOrderFieldOptions().then((allOrderFieldOptions) => {
          ExportSettingsModal.checkExportAllPoFieldsRadioButton();
          ExportSettingsModal.getAllOrderLineFieldOptions().then((allOrderLineFieldOptions) => {
            ExportSettingsModal.checkExportAllPolFieldsRadioButton();
            // Step 12: Leave "All" options selected by default
            ExportSettingsModal.clickExportButton();
            InteractorsTools.checkCalloutMessage(OrderStates.exportJobStartedSuccessfully);

            // Step 13: Verify exported file contains all PO and POL columns with all custom fields
            const headerValuesToVerifyInOrderLineFile = [
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
              headerValuesToVerifyInOrderLineFile,
            );

            // Remove "Custom fields - " prefix and trailing "+" to get actual column names
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
      },
    );
  });
});
