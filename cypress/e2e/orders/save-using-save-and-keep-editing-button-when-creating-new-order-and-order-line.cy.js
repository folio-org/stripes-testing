import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  OpenOrder,
  OrderLinesLimit,
  SettingsOrders,
} from '../../support/fragments/settings/orders';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_AND_ORDER_LINE_BUTTONS,
  ORDER_FORMAT_NAMES,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import {
  InventoryHoldings,
  InventoryInstance,
  InventoryInstances,
} from '../../support/fragments/inventory';
import {
  OrderDetails,
  OrderEditForm,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    instance: {},
    order: {},
    orderLine: {
      title: `autotest_title_${getRandomPostfix()}`,
      receivingNoteFirst: `autotest_receiving_note_first_${getRandomPostfix()}`,
      receivingNoteSecond: `autotest_receiving_note_second_${getRandomPostfix()}`,
    },
    user: {},
  };

  const buttonConditions = {
    saveCloseEnabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      {
        label: COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING,
        conditions: { disabled: false },
      },
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
      OrderLinesLimit.setPOLLimitViaApi(2);
      OpenOrder.setOpenOrderValue(false);
      SettingsOrders.setUserCanEditPONumberViaApi(false);
      Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` }).then(
          (location) => {
            testData.location = location;

            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.instance.instanceId,
                permanentLocationId: testData.location.id,
                sourceId: folioSource.id,
              }).then(({ id: holdingId }) => {
                testData.instance.holdingId = holdingId;
              });
            });
          },
        );
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiInventoryCreateOrderFromInstance.gui,
    ]).then((userProperties) => {
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
    if (testData.order.poNumber) {
      Orders.deleteOrderByOrderNumberViaApi(testData.order.poNumber);
    }
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    if (testData.instance.holdingId) {
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
    }
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
  });

  it(
    'C667566 Save using "Save & keep editing" button when creating new order and order line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C667566'] },
    () => {
      // Step 1: Check the initial state of the buttons on order edit form
      Orders.clickCreateNewOrder();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);
      OrderEditForm.getOrderNumber().then((poNumber) => {
        testData.order.poNumber = poNumber;
      });

      // Step 2: Check buttons state after filling Vendor field
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organization.name,
      });
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 3: Check Required fields after clicking "Save & keep editing" button
      OrderEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      OrderEditForm.checkRequiredFields([ORDER_VIEW_FIELD_LABELS.ORDER_TYPE]);

      // Step 4: Check buttons state after filling all required fields and clicking "Save & keep editing" button
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      OrderEditForm.clickSaveAndKeepEditingButton();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 5: Check buttons state after making changes
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONGOING });
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 6: Check buttons state after clicking "Save & keep editing" button
      OrderEditForm.clickSaveAndKeepEditingButton();
      OrderEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 7: Make changes and Close without saving, check that changes are not saved
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      OrderEditForm.cancelWithUnsavedChanges();
      OrderDetails.waitLoading();
      Orders.checkOrderDetails({
        vendor: testData.organization.name,
        orderType: ORDER_TYPES.ONGOING,
      });

      // Step 8: Check the initial state of the buttons on "Add PO line" form
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        {
          label: COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING,
          conditions: { disabled: false },
        },
        {
          label: COMMON_BUTTON_LABELS.SAVE_AND_CREATE_ANOTHER,
          conditions: { disabled: false },
        },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 9: Check Required fields after clicking "Save & keep editing" button
      OrderLineEditForm.fillOrderLineFields({ itemDetails: { title: testData.orderLine.title } });
      OrderLineEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      OrderLineEditForm.checkRequiredFields([
        POLINE_DETAILS_FIELDS.ORDER_FORMAT,
        POLINE_DETAILS_FIELDS.ACQUISITION_METHOD,
      ]);

      // Step 10: Check buttons state after filling all required fields and clicking "Save & keep editing" button
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        physicalQuantity: '1',
      });
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveAndKeepEditingButton({ orderLineCreated: true });
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        {
          label: COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING,
          conditions: { disabled: true },
        },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);
      OrderLineEditForm.checkButtonsNotDisplayed([COMMON_BUTTON_LABELS.SAVE_AND_CREATE_ANOTHER]);

      // Step 11: Check buttons state after making changes and clicking "Save & keep editing" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: testData.orderLine.receivingNoteFirst },
      });
      OrderLineEditForm.clickSaveAndKeepEditingButton();

      // Step 12: Make changes and Close without saving, check that changes are not saved
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: testData.orderLine.receivingNoteSecond },
      });
      OrderLineEditForm.cancelWithUnsavedChanges();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.RECEIVING_NOTE,
          conditions: { value: testData.orderLine.receivingNoteFirst },
        },
      ]);

      // Step 13: Create order from instance details pane and check buttons presence and state
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
      InventoryInstances.selectInstance();
      const NewOrderModal = InventoryInstance.openCreateNewOrderModal();
      NewOrderModal.clickCreateButton();
      OrderEditForm.waitLoading();
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: ORDER_AND_ORDER_LINE_BUTTONS.ADD_POL, conditions: { disabled: true } },
      ]);
      OrderEditForm.checkButtonsNotDisplayed([COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING]);

      // Step 14: Cancel order creation
      OrderEditForm.clickCancelButton();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyOrdersCount(0);
    },
  );
});
