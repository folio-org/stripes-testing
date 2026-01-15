import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { NewOrder, OrderLineDetails, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OpenOrder from '../../support/fragments/settings/orders/openOrder';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const isOpenOrderEnabled = true;
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      OpenOrder.setOpenOrderValue(isOpenOrderEnabled);

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      }, 20_000);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      OpenOrder.setOpenOrderValue(false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C6531 Save and open PO from POL create or edit form (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C6531'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.checkOrderLinesTableContent();

      // Click "Actions", Select "Add PO line" option
      const OrderLineEditForm = OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkButtonsConditions([
        { label: 'Save & open order', conditions: { disabled: false } },
      ]);

      // Fill in all the mandatory fields, Click "Save & open order" button
      const poLineTitle = `autotest_pol_${testData.order.poNumber}`;
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: poLineTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveAndOpenOrderButton();

      // Return to "Purchase order" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderLinesTableContent([
        { poLineNumber: testData.order.poNumber, poLineTitle },
      ]);

      // Click "Actions" button, Select "Unopen" option, Click "Submit" button
      OrderDetails.unOpenOrder({ submit: true });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // On "PO lines" accordion click on the record with just created PO line
      OrderDetails.openPolDetails(poLineTitle);

      // Click "Actions" button, Select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: true } },
        { label: 'Save & open order', conditions: { disabled: false } },
      ]);

      // Edit "Receiving note" field, Click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { receivingNote: `autotest_note_${testData.order.poNumber}` },
      });
      OrderLineEditForm.clickSaveButton();
    },
  );
});
