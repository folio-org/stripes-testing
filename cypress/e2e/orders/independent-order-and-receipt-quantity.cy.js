import {
  COMMON_BUTTON_LABELS,
  ORDER_STATUSES,
  RECEIPT_STATUS_VIEW,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineEditForm, {
  orderLineFields,
} from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { OpenOrder } from '../../support/fragments/settings/orders';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const instanceTitle = `AT_C389465_FolioInstance_${getRandomPostfix()}`;
  const itemBarcode = getRandomPostfix();
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  let orderNumber;
  let user;
  let location;
  let instanceId;

  before(() => {
    cy.getAdminToken();
    instanceId = InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
    Locations.getViaApiAnyDefault().then((locations) => {
      [location] = locations;
      Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
        organization.id = organizationsResponse;
        order.vendor = organizationsResponse;
      });
      cy.createOrderApi(order).then((response) => {
        order.id = response.body.id;
        orderNumber = response.body.poNumber;
      });
    });

    cy.createTempUser([permissions.uiOrdersCreate.gui, permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        user = userProperties;
      },
    );
  });

  after(() => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C389465 Receiving workflow is automatically set to "Independent order and receipt quantity" if a user selects "Receipt not required" receipt status (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C389465', 'nonParallel'] },
    () => {
      // Precondition #4: "Allow save and open purchase order when creating or
      // editing a purchase order line" checkbox must be unchecked.
      OpenOrder.setOpenOrderValue(false);

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });

      // Step 1: open the order from Preconditions #3
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: "Add PO line" page opens with default field/button states
      Orders.createPOLineViaActions();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'receiptStatus', conditions: { hasValue: false } },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
            disabled: false,
          },
        },
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 3: check "Receiving workflow" dropdown options
      OrderLineEditForm.checkSelectOptions(orderLineFields.checkinItems, [
        ' ',
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ]);

      // Step 4: check "Receipt status" dropdown options
      OrderLineEditForm.checkSelectOptions(orderLineFields.receiptStatus, [
        ' ',
        RECEIPT_STATUS_VIEW.PENDING,
        RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED,
      ]);

      // Step 5: select "Pending" and re-check "Receiving workflow" dropdown options
      OrderLineEditForm.fillOrderLineFields({ receiptStatus: RECEIPT_STATUS_VIEW.PENDING });
      OrderLineEditForm.checkSelectOptions(orderLineFields.checkinItems, [
        ' ',
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ]);
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
            disabled: false,
          },
        },
      ]);

      // Step 6: select "Receipt not required" in "Receipt status" dropdown
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED,
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);

      // Step 7-8: fill mandatory fields on the "Add PO line" page with any values
      OrderLines.selectRandomInstanceInTitleLookUP(instanceTitle, 0);
      OrderLines.POLineInfoWithReceiptNotRequiredStatus(location.name);

      // Step 9: Check "Receipt status" and "Receiving workflow" fields under "Purchase order line" accordion
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );

      // Step 10: open "Edit PO line" and verify default field/button states
      OrderLines.editPOLInOrder();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 11: select "Pending" - "Receiving workflow" dropdown becomes editable
      OrderLineEditForm.fillOrderLineFields({ receiptStatus: RECEIPT_STATUS_VIEW.PENDING });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: false,
          },
        },
      ]);

      // Step 12: select "Synchronized order and receipt quantity" and save
      OrderLines.POLineInfoEditWithPendingReceiptStatus();
      OrderLines.checkCalloutMessageInEditedPOL(orderNumber, '1');

      // Step 13: check "Receipt status" and "Receiving workflow" fields under "Purchase order line" accordion
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.PENDING);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      );

      // Step 14: open "Edit PO line" again and verify default field/button states
      OrderLines.editPOLInOrder();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'receiptStatus', conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.PENDING } },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
        },
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 15: select "Receipt not required" in "Receipt status" dropdown
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED,
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);

      // Step 16: save the PO line
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: false });
      OrderLines.checkCalloutMessageInEditedPOL(orderNumber, '1');

      // Step 17: check "Receipt status" and "Receiving workflow" fields under "Purchase order line" accordion
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );

      // Step 18: back to the order
      OrderLines.backToEditingOrder();

      // Step 19: open the order
      Orders.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Steps 20-21: verify the values persist after the order is opened
      OrderLines.selectPOLInOrder(0);
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );
    },
  );
});
