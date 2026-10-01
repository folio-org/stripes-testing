import {
  ACQUISITION_METHOD_NAMES,
  COMMON_BUTTON_LABELS,
  ORDER_SEARCH_OPTIONS,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderEditForm,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import dateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OpenOrder } from '../../support/fragments/settings/orders';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organizationFirst: NewOrganization.getDefaultOrganization(),
    organizationSecond: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    orderLineTitles: {
      titleFirst: `autotest_title_first_${getRandomPostfix()}`,
      titleSecond: `autotest_title_second_${getRandomPostfix()}`,
    },
    user: {},
    adminUser: {},
    locale: 'en-US',
    timezone: 'UTC',
  };

  const buttonConditions = {
    saveCloseEnabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
    ],
    saveCloseDisabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING, conditions: { disabled: true } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.getAdminUserDetails().then((adminUser) => {
        testData.adminUser = adminUser;
      });

      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale.locale || 'en-US';
        testData.timezone = locale.timezone || 'UTC';
      });

      OpenOrder.setOpenOrderValue(false);

      Organizations.createOrganizationViaApi(testData.organizationFirst)
        .then((organizationId) => {
          testData.organizationFirst.id = organizationId;

          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organizationFirst.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitles.titleFirst,
          });

          return Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine);
        })
        .then((order) => {
          testData.order = order;
        });

      Organizations.createOrganizationViaApi(testData.organizationSecond).then((organizationId) => {
        testData.organizationSecond.id = organizationId;
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderByOrderNumberViaApi(testData.order.poNumber);
    Organizations.deleteOrganizationViaApi(testData.organizationFirst.id);
    Organizations.deleteOrganizationViaApi(testData.organizationSecond.id);
  });

  it(
    'C667567 Save using "Save & keep editing" button when editing order and order line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C667567'] },
    () => {
      // Step 1: Search for the order and open it
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Open order edit form and check buttons conditions
      OrderDetails.openOrderEditForm();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 3: Clear required field and check buttons conditions
      OrderEditForm.clearVendorField();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 4: Click "Save & keep editing" button and check required field message
      OrderEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      OrderEditForm.checkRequiredFields([ORDER_VIEW_FIELD_LABELS.VENDOR]);

      // Step 5: Fill required field with a different value and check buttons conditions
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organizationSecond.name,
      });
      OrderEditForm.clickSaveAndKeepEditingButton();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 6: Make changes and check buttons conditions
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organizationFirst.name,
      });
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 7: Click "Save & keep editing" button and check buttons conditions
      OrderEditForm.clickSaveAndKeepEditingButton();

      Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
        testData.order.updatedDate = order.metadata.updatedDate;
        testData.order.createdDate = order.metadata.createdDate;

        OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

        // Wait to ensure that updatedDate is saved for the last edit
        cy.wait(60000).then(() => {
          // Step 8: Make changes and Close without saving, check that changes are not saved
          OrderEditForm.fillOrderInfoSectionFields({
            organizationName: testData.organizationSecond.name,
          });
          OrderEditForm.cancelWithUnsavedChanges();
          OrderDetails.waitLoading();
          Orders.checkOrderDetails({ vendor: testData.organizationFirst.name });
          OrderDetails.toggleMetadataAccordion();
          OrderDetails.verifyMetadataContent({
            updated: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.order.updatedDate,
              testData.timezone,
              testData.locale,
            ),
            updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
            created: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.order.createdDate,
              testData.timezone,
              testData.locale,
            ),
            createdBy: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
          });
        });
      });

      // Step 9: Open order line
      OrderDetails.openPolDetails(testData.orderLineTitles.titleFirst);

      // Step 10: Open order line edit form and check buttons conditions
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);
      OrderLineEditForm.checkButtonsNotDisplayed([COMMON_BUTTON_LABELS.SAVE_AND_CREATE_ANOTHER]);

      // Step 11: Clear required field and check buttons conditions
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE },
      });
      OrderLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 12: Click "Save & keep editing" button
      OrderLineEditForm.clickSaveAndKeepEditingButton({ isSaved: false });

      // Step 13: Fill required field with a different value and click "Save & keep editing" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.orderLineTitles.titleSecond },
      });
      OrderLineEditForm.clickSaveAndKeepEditingButton();

      // Step 14: Make changes and check buttons conditions
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.orderLineTitles.titleFirst },
      });
      OrderLineEditForm.clickSaveAndKeepEditingButton();

      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        testData.orderLine.updatedDate = orderLine.metadata.updatedDate;
        testData.orderLine.createdDate = orderLine.metadata.createdDate;

        // Wait to ensure that updatedDate is saved for the last edit
        cy.wait(60000).then(() => {
          // Step 15: Make changes and Close without saving, check that changes are not saved
          OrderLineEditForm.fillOrderLineFields({
            itemDetails: { title: testData.orderLineTitles.titleSecond },
          });
          OrderLineEditForm.cancelWithUnsavedChanges();
          OrderLineDetails.waitLoading();
          OrderLineDetails.checkFieldsConditions([
            {
              label: POLINE_DETAILS_FIELDS.TITLE,
              conditions: { value: testData.orderLineTitles.titleFirst },
            },
          ]);
          OrderLineDetails.toggleMetadataAccordion();
          OrderLineDetails.verifyMetadataContent({
            updated: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.orderLine.updatedDate,
              testData.timezone,
              testData.locale,
            ),
            updatedBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
            created: dateTools.getFormattedDateTimeInTimezoneForMetadata(
              testData.orderLine.createdDate,
              testData.timezone,
              testData.locale,
            ),
            createdBy: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
          });
        });
      });
    },
  );
});
