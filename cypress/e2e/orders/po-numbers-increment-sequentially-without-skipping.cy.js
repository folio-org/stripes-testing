import Permissions from '../../support/dictionary/permissions';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderEditForm from '../../support/fragments/orders/orderEditForm';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const orderSavedMessage = (poNumber) => {
    return `The Purchase order - ${poNumber} has been successfully saved`;
  };
  let testData;

  before(() => {
    testData = {
      organization: { ...NewOrganization.defaultUiOrganizations },
      createdOrder: {},
      nextOrder: {},
      user: {},
    };
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.createdOrder.id, false);
    Orders.deleteOrderViaApi(testData.nextOrder.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C663245 PO Numbers Increment Sequentially Without Skipping (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C663245', 'nonParallel'] },
    () => {
      // Step 1: Create an order with a vendor and an order type
      Orders.createOrderForRollover({
        vendor: testData.organization.name,
        orderType: 'One-time',
      }).then((order) => {
        testData.createdOrder = order;

        InteractorsTools.checkCalloutMessage(orderSavedMessage(order.poNumber));
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          orderInformation: [{ key: 'PO number', value: order.poNumber }],
        });
      });

      // Step 2: Edit the newly created order (change the order type) and save
      OrderDetails.openOrderEditForm();
      OrderEditForm.fillOrderFields({ orderInfo: { orderType: 'Ongoing' } });
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: 'Order type', value: 'Ongoing' }],
      });

      // Step 3: Create a new order with a vendor and an order type
      Orders.closeThirdPane();
      Orders.createOrderForRollover({
        vendor: testData.organization.name,
        orderType: 'One-time',
      }).then((order) => {
        testData.nextOrder = order;

        InteractorsTools.checkCalloutMessage(orderSavedMessage(order.poNumber));
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          orderInformation: [{ key: 'PO number', value: order.poNumber }],
        });
      });

      // Step 4: Verify the order numbers on the Orders pane
      Orders.closeThirdPane();
      cy.then(() => {
        Orders.checkIsOrderCreated(testData.createdOrder.poNumber);
        Orders.checkSearchResults(testData.nextOrder.poNumber);

        // The order created in Step 3 must be exactly one higher than the order edited in Step 2
        expect(
          Number(testData.nextOrder.poNumber),
          `PO number of the new order (${testData.nextOrder.poNumber}) is exactly one higher than PO number of the edited order (${testData.createdOrder.poNumber})`,
        ).to.equal(Number(testData.createdOrder.poNumber) + 1);
      });
    },
  );
});
