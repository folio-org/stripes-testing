import {
  BUDGET_STATUSES,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderStates from '../../support/fragments/orders/orderStates';
import TopMenu from '../../support/fragments/topMenu';
import InteractorsTools from '../../support/utils/interactorsTools';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    expenseClass: {},
    fundA: {},
    budgetA: {},
    fundB: {},
    budgetB: {},
    order1: {},
    order2: {},
    orderLine1: {},
    orderLine2: {},
    user: {},
  };

  const createExpenseClass = () => {
    const expenseClass = ExpenseClasses.getDefaultExpenseClass();

    return ExpenseClasses.createExpenseClassViaApi(expenseClass).then((response) => {
      testData.expenseClass = response;
    });
  };

  const createFinanceData = () => {
    const financeDataA = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      expenseClasses: [testData.expenseClass],
    });
    testData.fundA = financeDataA.fund;
    testData.budgetA = financeDataA.budget;

    const financeDataB = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      expenseClasses: [testData.expenseClass],
    });
    testData.fundB = financeDataB.fund;
    testData.budgetB = financeDataB.budget;
  };

  const createOrderWithFund = (fund) => {
    const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
    const orderLine = BasicOrderLine.getDefaultOrderLine({
      fundDistribution: [
        {
          code: fund.code,
          fundId: fund.id,
          expenseClassId: testData.expenseClass.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    });

    return Orders.createOrderWithOrderLineViaApi(order, orderLine).then((createdOrder) => {
      return OrderLines.getOrderLineByIdViaApi(orderLine.id).then((createdOrderLine) => ({
        order: createdOrder,
        orderLine: createdOrderLine,
      }));
    });
  };

  const createOrders = () => {
    Organizations.createOrganizationViaApi(testData.organization);

    return createOrderWithFund(testData.fundA).then(({ order, orderLine }) => {
      testData.order1 = order;
      testData.orderLine1 = orderLine;

      return createOrderWithFund(testData.fundB).then((secondOrderData) => {
        testData.order2 = secondOrderData.order;
        testData.orderLine2 = secondOrderData.orderLine;
      });
    });
  };

  const setFundABudgetInactive = () => {
    return Budgets.getBudgetByIdViaApi(testData.budgetA.id).then((budgetResponse) => {
      Budgets.updateBudgetViaApi({
        ...budgetResponse,
        budgetStatus: BUDGET_STATUSES.INACTIVE,
      });
    });
  };

  const setFundBExpenseClassInactive = () => {
    return Budgets.getBudgetByIdViaApi(testData.budgetB.id).then((budgetResponse) => {
      Budgets.updateBudgetViaApi({
        ...budgetResponse,
        statusExpenseClasses: budgetResponse.statusExpenseClasses.map((expenseClassStatus) => ({
          ...expenseClassStatus,
          status: EXPENSE_CLASS_STATUSES.INACTIVE,
        })),
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createExpenseClass().then(() => {
        createFinanceData();

        createOrders().then(() => {
          setFundABudgetInactive();
          setFundBExpenseClassInactive();
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order1.id);
      Orders.deleteOrderViaApi(testData.order2.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      cy.wrap([testData.budgetA.id, testData.budgetB.id])
        .each((budgetId) => {
          Budgets.getBudgetViaApi({ query: `id=="${budgetId}"` }).then((budgetResponse) => {
            Budgets.updateBudgetViaApi({
              ...budgetResponse.budgets[0],
              statusExpenseClasses: [],
            });
          });
        })
        .then(() => {
          ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass.id);
        });
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetA);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetB);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C1347111 Informative error message appears when expense class not found and inactive (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1347111'] },
    () => {
      // Step 1: Try to open Order #1 - Fund A budget is Inactive
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.intercept('PUT', `/orders/composite-orders/${testData.order1.id}`).as('openOrder1');
      Orders.openOrder();
      cy.wait('@openOrder1').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 400,
          expectedErrorCode: OrderStates.budgetExpenseClassNotFound,
          expectedErrorMessage: OrderStates.budgetExpenseClassNotFoundAPIMessage,
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.budgetExpenseClassNotFoundError(
          testData.expenseClass.name,
          testData.fundA.code,
        ),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 2: Open PO line details, Initial/Current encumbrance columns are blank
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          expenseClass: testData.expenseClass.name,
          value: '100%',
          amount: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);

      // Step 3: Navigate to Order #2, try to open it - Fund B expense class is Inactive
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      Orders.selectFromResultsList(testData.order2.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.intercept('PUT', `/orders/composite-orders/${testData.order2.id}`).as('openOrder2');
      Orders.openOrder();
      cy.wait('@openOrder2').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 400,
          expectedErrorCode: OrderStates.inactiveExpenseClass,
          expectedErrorMessage: OrderStates.expenseClassIsInactiveAPIMessage,
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.inactiveExpenseClassError(testData.expenseClass.name),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 4: Open PO line details, Initial/Current encumbrance columns are blank
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundB.name,
          expenseClass: testData.expenseClass.name,
          value: '100%',
          amount: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
    },
  );
});
