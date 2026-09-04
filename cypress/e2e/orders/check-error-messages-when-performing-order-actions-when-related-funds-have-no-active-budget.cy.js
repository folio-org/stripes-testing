import { matching } from '@interactors/html';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  BUDGET_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fundA: {},
    fundB: {},
    budgetA: {},
    budgetB: {},
    acquisitionMethod: null,
    order1: {},
    order2: {},
    order3: {},
    orderLine1FundA: {},
    orderLine1FundB: {},
    orderLine2: {},
    orderLine3: {},
    user: {},
  };

  const createFinanceData = () => {
    const {
      fiscalYear,
      ledger,
      fund: fundA,
      budget: budgetA,
    } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      fund: {
        name: `autotest_fundA_${getRandomPostfix()}`,
        code: `autotest_fundA_${getRandomPostfix()}`,
      },
      budget: { allocated: 1000 },
    });
    testData.fiscalYear = fiscalYear;
    testData.ledger = ledger;
    testData.fundA = fundA;
    testData.budgetA = budgetA;

    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      name: `autotest_fundB_${getRandomPostfix()}`,
      code: `autotest_fundB_${getRandomPostfix()}`,
      ledgerId: ledger.id,
    }).then((fundBResponse) => {
      testData.fundB = fundBResponse.fund;

      return Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        fiscalYearId: fiscalYear.id,
        fundId: testData.fundB.id,
        allocated: 1000,
      }).then((budgetBResponse) => {
        testData.budgetB = budgetBResponse;
      });
    });
  };

  const createOrganizationAndAcquisitionMethod = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then(() => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethod = body.acquisitionMethods[0].id;
        });
    });
  };

  const createOpenOrder = (fundDistributions) => {
    const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

    return Orders.createOrderViaApi(order).then((createdOrder) => {
      const orderLinesToCreate = fundDistributions.map((fundDistribution) => BasicOrderLine.getDefaultOrderLine({
        acquisitionMethod: testData.acquisitionMethod,
        purchaseOrderId: createdOrder.id,
        listUnitPrice: 10,
        fundDistribution,
      }));

      const orderLines = [];
      orderLinesToCreate.forEach((orderLine) => {
        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          orderLines.push(createdOrderLine);
        });
      });

      return Orders.updateOrderViaApi({
        ...createdOrder,
        workflowStatus: ORDER_STATUSES.OPEN,
      }).then(() => ({ order: createdOrder, orderLines }));
    });
  };

  const createOrder1 = () => {
    return createOpenOrder([
      [
        {
          code: testData.fundA.code,
          fundId: testData.fundA.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
      [
        {
          code: testData.fundB.code,
          fundId: testData.fundB.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    ]).then(({ order, orderLines }) => {
      testData.order1 = { ...order, workflowStatus: ORDER_STATUSES.OPEN };
      testData.orderLine1FundA = orderLines[0];
      testData.orderLine1FundB = orderLines[1];
    });
  };

  const createOrder2 = () => {
    return createOpenOrder([
      [
        {
          code: testData.fundA.code,
          fundId: testData.fundA.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 50,
        },
        {
          code: testData.fundB.code,
          fundId: testData.fundB.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 50,
        },
      ],
    ]).then(({ order, orderLines }) => {
      testData.orderLine2 = orderLines[0];

      return Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.CLOSED,
        closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE },
      }).then(() => {
        testData.order2 = { ...order, workflowStatus: ORDER_STATUSES.CLOSED };
      });
    });
  };

  const createOrder3 = () => {
    return createOpenOrder([
      [
        {
          code: testData.fundA.code,
          fundId: testData.fundA.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    ]).then(({ order, orderLines }) => {
      testData.orderLine3 = orderLines[0];

      return Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }).then(
        () => {
          testData.order3 = { ...order, workflowStatus: ORDER_STATUSES.PENDING };
        },
      );
    });
  };

  const setFundBudgetsStatus = (budgetStatus) => {
    return Budgets.getBudgetByIdViaApi(testData.budgetA.id)
      .then((budgetResponse) => {
        Budgets.updateBudgetViaApi({ ...budgetResponse, budgetStatus });
      })
      .then(() => Budgets.getBudgetByIdViaApi(testData.budgetB.id))
      .then((budgetResponse) => {
        Budgets.updateBudgetViaApi({ ...budgetResponse, budgetStatus });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(3);

      createFinanceData()
        .then(() => createOrganizationAndAcquisitionMethod())
        .then(() => createOrder1())
        .then(() => createOrder2())
        .then(() => createOrder3())
        .then(() => setFundBudgetsStatus(BUDGET_STATUSES.CLOSED));
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersCancelPurchaseOrders.gui,
      Permissions.uiOrdersReopenPurchaseOrders.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
      Permissions.uiOrdersUpdateEncumbrances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      setFundBudgetsStatus(BUDGET_STATUSES.ACTIVE);
      [testData.order1.id, testData.order2.id, testData.order3.id].forEach((id) => {
        Orders.deleteOrderViaApi(id);
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(testData.budgetA.id);
      Budgets.deleteViaApi(testData.budgetB.id);
      Funds.deleteFundViaApi(testData.fundA.id);
      Funds.deleteFundViaApi(testData.fundB.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C1434646 Check error messages when performing order actions when related fund(s) have no active budget (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1434646'] },
    () => {
      const relatedFundCodes = [testData.fundA.code, testData.fundB.code];

      // Step 1: Open Order #1 details
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Cancel Order #1 and verify error toast
      OrderDetails.closeOrder({ orderNumber: testData.order1.poNumber, checkSuccess: false });
      InteractorsTools.checkCalloutErrorMessage(
        matching(
          OrderStates.budgetNotFoundForFiscalYearCancel(relatedFundCodes, testData.fiscalYear.code),
        ),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      InteractorsTools.closeCalloutMessage();

      // Step 3: Close Order #1 and verify error toast
      OrderDetails.waitLoading();
      Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.LACK_OF_FUNDS, false);
      InteractorsTools.checkCalloutErrorMessage(
        matching(
          OrderStates.budgetNotFoundForFiscalYearClose(relatedFundCodes, testData.fiscalYear.code),
        ),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      InteractorsTools.closeCalloutMessage();

      // Step 4: Unopen Order #1 and verify error toast
      OrderDetails.waitLoading();
      OrderDetails.unOpenOrder({ confirm: true, submit: true });
      InteractorsTools.checkCalloutErrorMessage(
        matching(
          OrderStates.budgetNotFoundForFiscalYearUnopen(relatedFundCodes, testData.fiscalYear.code),
        ),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      InteractorsTools.closeCalloutMessage();

      // Step 5: Update encumbrances for Order #1 and verify error toast
      OrderDetails.waitLoading();
      OrderDetails.updateEncumbrances();
      InteractorsTools.checkCalloutErrorMessage(
        matching(
          OrderStates.budgetNotFoundForFiscalYearUpdateEncumbrances(
            relatedFundCodes,
            testData.fiscalYear.code,
          ),
        ),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      InteractorsTools.closeCalloutMessage();

      // Step 6: Open PO line #1, Fund A is displayed with $10.00 in Amount/Initial/Current encumbrance
      OrderDetails.openPolDetails(testData.orderLine1FundA.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          amount: `$${testData.orderLine1FundA.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine1FundA.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine1FundA.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Steps 7-8 are temporarily disabled until MODORDERS-1477, UIOR-1575 are implemented
      // // Step 7: Navigate to Order #2, Actions > Re-open
      // Orders.selectOrdersPane();
      // Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      // Orders.selectFromResultsList(testData.order2.poNumber);
      // OrderDetails.waitLoading();
      // OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);

      // OrderDetails.reOpenOrder({ checkMessage: false });
      // InteractorsTools.checkCalloutErrorMessage(
      //   OrderStates.noCurrentBudgetForFund(relatedFundCodes, testData.fiscalYear.code),
      // );
      // OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      // InteractorsTools.closeCalloutMessage();

      // Step 8: Open the PO line, Fund A and Fund B are displayed with $0.00 in Amount/Initial/Current encumbrance
      // OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      // OrderLineDetails.checkFundDistibutionTableContent([
      //   {
      //     name: testData.fundA.name,
      //     amount: '$0.00',
      //     initialEncumbrance: '$0.00',
      //     currentEncumbrance: '$0.00',
      //   },
      //   {
      //     name: testData.fundB.name,
      //     amount: '$0.00',
      //     initialEncumbrance: '$0.00',
      //     currentEncumbrance: '$0.00',
      //   },
      // ]);

      // Step 9: Open Order #3 and verify error toast
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order3.poNumber);
      Orders.selectFromResultsList(testData.order3.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.openOrder();
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.noCurrentBudgetForFund(testData.fundA.code, testData.fiscalYear.code),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 10: Open the PO line, Fund A is displayed with $0.00 in Amount/Initial/Current encumbrance
      OrderDetails.openPolDetails(testData.orderLine3.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          amount: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: '$0.00',
          currentEncumbrance: '$0.00',
        },
      ]);
    },
  );
});
