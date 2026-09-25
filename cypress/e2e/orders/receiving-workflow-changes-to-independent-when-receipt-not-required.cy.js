import { RECEIPT_STATUS_SELECTED, RECEIVING_WORKFLOW_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  let order;
  let organization;
  let user;

  before(() => {
    order = {
      ...NewOrder.getDefaultOngoingOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    organization = { ...NewOrganization.defaultUiOrganizations };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      order.vendor = organization.id;
      Orders.createOrderViaApi(order).then((orderResponse) => {
        order.id = orderResponse.id;
        order.poNumber = orderResponse.poNumber;
      });
    });

    cy.createTempUser([permissions.uiOrdersEdit.gui, permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', order.poNumber);
        Orders.selectFromResultsList(order.poNumber);
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C451472 "Receiving workflow" changes to "Independent order and receipt quantity" when "Receipt status" is set to "Receipt not required" while POL create (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451472'] },
    () => {
      // Step 1: On "PO lines" accordion click "Actions" -> "Add PO line"
      Orders.createPOLineViaActions();
      OrderLineEditForm.waitLoading();

      // Step 2: Pick "Synchronized order and receipt quantity" from "Receiving workflow" dropdown
      OrderLineEditForm.fillPoLineDetails({
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
        },
      ]);

      // Step 3: Pick "Receipt not required" option from "Receipt status" dropdown
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
          },
        },
      ]);

      // Step 4: Click on "Receiving workflow" dropdown - dropdown is inactive
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'checkinItems', conditions: { disabled: true } },
      ]);

      // Step 5: Pick <blank> option from "Receipt status" dropdown
      OrderLineEditForm.selectBlankReceiptStatus();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'receiptStatus', conditions: { checkedOptionText: ' ' } },
        { label: 'checkinItems', conditions: { disabled: false } },
      ]);
    },
  );
});
