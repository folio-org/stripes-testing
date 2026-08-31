import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { Budgets } from '../../support/fragments/finance';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrderStates from '../../support/fragments/orders/orderStates';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    user: {},
  };

  const createFinanceData = () => {
    const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      ledger: { restrictEncumbrance: true },
      budget: { allocated: 10 },
    });
    testData.fundA = financeData.fund;
    testData.budgetA = financeData.budget;
  };

  const createOrder = () => {
    Organizations.createOrganizationViaApi(testData.organization);

    testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

    return Orders.createOrderViaApi(testData.order).then((order) => {
      testData.order = order;
    });
  };

  const createOrderLine = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        const acquisitionMethod = body.acquisitionMethods[0].id;

        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          titleOrPackage: `autotest_title_${getRandomPostfix()}`,
          acquisitionMethod,
          purchaseOrderId: testData.order.id,
          title: testData.orderLineTitle,
          listUnitPrice: 100,
          fundDistribution: [
            {
              code: testData.fundA.code,
              fundId: testData.fundA.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          locations: [],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
          },
        });

        return OrderLines.createOrderLineViaApi(testData.orderLine).then((orderLine) => {
          testData.orderLine = orderLine;
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createFinanceData();
      createOrder().then(() => createOrderLine());
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetA);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C446092 An order could not be opened when estimated price exceeds total budget allocation (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C446092'] },
    () => {
      // Step 1: Open the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.intercept('PUT', `/orders/composite-orders/${testData.order.id}`).as('openOrder');

      // Step 3: Try to open the order, Fund A does not have enough money
      Orders.openOrder();
      cy.wait('@openOrder').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 422,
          expectedErrorCode: OrderStates.fundCannotBePaid,
          expectedErrorMessage: OrderStates.fundCannotBePaidDueToRestricrions,
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.notEnoughMoneyInFundError(testData.fundA.code),
      );
      InteractorsTools.closeAllVisibleCallouts();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 4: Repeat opening the order, the same error appears again
      Orders.openOrder();
      cy.wait('@openOrder').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 422,
          expectedErrorCode: OrderStates.fundCannotBePaid,
          expectedErrorMessage: OrderStates.fundCannotBePaidDueToRestricrions,
        });
      });
      Orders.checkOrderIsNotOpened(testData.fundA.code);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
    },
  );
});
