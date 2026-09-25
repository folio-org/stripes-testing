import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  BUDGET_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  FUND_STATUSES,
  LEDGER_STATUSES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  REQUEST_METHOD,
  TRANSACTION_SOURCE_TYPES,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { Budgets, Funds, Transactions } from '../../support/fragments/finance';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderStates from '../../support/fragments/orders/orderStates';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';
import InteractorsTools from '../../support/utils/interactorsTools';
import { formatCurrency } from '../../support/utils/numberTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const R = {
  FINANCE_A: 'financeA',
  FUND_B: 'fundB',
  BUDGET_B: 'budgetB',
  LOCALE: 'locale',
  ORGANIZATION: 'organization',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  ORDER_3: 'order3',
  USER: 'user',
  POL_LIMIT: 'polLimit',
};

const TEST_VALUES = {
  INITIAL_ALLOCATION: 300,
  REDUCE_ALLOCATION: 260,
  LINE_PRICE: 100,
  POL_LIMIT: 3,
  VENDOR_NAME: 'AT_C1464357_Vendor',
  VENDOR_CODE: 'AT_C1464357',
  ORDER_PREFIX: 'AT_C1464357_Order',
  FUNDS_PARAMETER_KEY: 'finance.funds',
  CURRENCY: { locale: 'en-US', currency: 'USD' },
};

const expectedCurrency = (value) => formatCurrency(value, TEST_VALUES.CURRENCY);

const parseFundCodes = (value) => value
  .replace(/^\[|\]$/g, '')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean);

const createFundDistribution = (fund, value) => ({
  code: fund.code,
  fundId: fund.id,
  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
  value,
});

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();

  const waitForFilters = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
    phase: PANE_REQUEST_PHASES.FILTERS,
    trigger,
  });

  const waitForResults = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
    trigger,
  });

  const createOrder = (f, { key, title, lineDistributions }) => {
    const order = NewOrder.getDefaultOrder({
      vendorId: f.get(R.ORGANIZATION).id,
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    });

    return Orders.createOrderViaApi(order).then((createdOrder) => {
      f.set(key, createdOrder, () => Orders.deleteOrderViaApi(createdOrder.id, false));

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
        })
        .then(({ body }) => {
          const orderLines = lineDistributions.map((fundDistribution, index) => BasicOrderLine.getDefaultOrderLine({
            title: `${title}_${index + 1}_${postfix}`,
            acquisitionMethod: body.acquisitionMethods[0].id,
            purchaseOrderId: createdOrder.id,
            listUnitPrice: TEST_VALUES.LINE_PRICE,
            fundDistribution,
            orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            locations: [],
            physical: { createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE },
          }));

          return cy
            .wrap(orderLines)
            .each((orderLine) => OrderLines.createOrderLineViaApi(orderLine))
            .then(() => f.set(`${key}Lines`, orderLines, (createdLines) => createdLines.forEach((orderLine) => OrderLines.deleteOrderLineViaApi(orderLine.id, false))));
        })
        .then(() => Orders.updateOrderViaApi({
          ...createdOrder,
          workflowStatus: ORDER_STATUSES.OPEN,
        }))
        .then(() => Orders.updateOrderViaApi({
          ...createdOrder,
          closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED, note: '' },
          workflowStatus: ORDER_STATUSES.CLOSED,
        }));
    });
  };

  const verifyReopenFailure = ({ order, fundCodes, totalPrice }) => {
    cy.intercept(REQUEST_METHOD.PUT, `**/orders/composite-orders/${order.id}`).as('reopenOrder');

    OrderDetails.reOpenOrder({ orderNumber: order.poNumber, checkMessage: false });
    cy.wait('@reopenOrder').then((interception) => {
      OrderDetails.checkApiErrorResponse(interception, {
        expectedStatus: 422,
        expectedErrorCode: OrderStates.fundCannotBePaid,
        expectedErrorMessage: OrderStates.fundCannotBePaidDueToRestricrions,
      });
      const fundsParameter = interception.response.body.errors[0].parameters.find(
        ({ key }) => key === TEST_VALUES.FUNDS_PARAMETER_KEY,
      );
      expect(fundsParameter).to.not.equal(undefined);
      const actualFundCodes = parseFundCodes(fundsParameter.value);

      expect(actualFundCodes).to.have.members(fundCodes);
      expect(actualFundCodes).to.have.length(fundCodes.length);
    });
    InteractorsTools.checkOneOfCalloutsContainsErrorMessage(
      OrderStates.notEnoughMoneyInFundsErrorPrefix,
    );
    fundCodes.forEach((fundCode) => {
      InteractorsTools.checkOneOfCalloutsContainsErrorMessage(fundCode);
    });
    OrderDetails.verifyOrderTitle(OrderStates.purchaseOrderPaneTitle(order.poNumber));
    OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
    OrderDetails.checkOrderDetails({
      summary: [
        {
          key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
          value: expectedCurrency(totalPrice),
        },
        {
          key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED,
          value: expectedCurrency(0),
        },
      ],
    });
  };

  before('Create C1464357 preconditions', () => {
    cy.getAdminToken();
    cy.clearLocalStorage();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: Set the purchase order line limit above two.
      .step((f) => {
        return OrderLinesLimit.getPOLLimit().then((settings) => {
          const previousSetting = settings[0];

          f.set(R.POL_LIMIT, previousSetting, () => (previousSetting
            ? OrderLinesLimit.setPOLLimitViaApi(previousSetting.value)
            : OrderLinesLimit.getPOLLimit().then(
              (s) => s[0] && OrderLinesLimit.deletePOLLimit(settings[0]),
            )));

          return OrderLinesLimit.setPOLLimitViaApi(TEST_VALUES.POL_LIMIT);
        });
      })
      // Precondition 2: Create the current fiscal year.
      // Precondition 3: Create an active restricted ledger related to the current fiscal year.
      // Precondition 4: Create two active funds with $300 current budgets related to the ledger.
      .step((f) => {
        const financeA = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          ledger: {
            ledgerStatus: LEDGER_STATUSES.ACTIVE,
            restrictEncumbrance: true,
            restrictExpenditures: true,
          },
          fund: {
            fundStatus: FUND_STATUSES.ACTIVE,
            code: `FNDA${postfix}`,
          },
          budget: {
            allocated: TEST_VALUES.INITIAL_ALLOCATION,
            budgetStatus: BUDGET_STATUSES.ACTIVE,
          },
        });

        f.set(R.FINANCE_A, financeA, () => Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
          id: financeA.budget.id,
          fundId: financeA.fund.id,
          ledgerId: financeA.ledger.id,
          fiscalYearId: financeA.fiscalYear.id,
        }));
      })
      .step((f) => {
        const fundB = {
          ...Funds.getDefaultFund(),
          fundStatus: FUND_STATUSES.ACTIVE,
          ledgerId: f.get(R.FINANCE_A).ledger.id,
          code: `FNDB${postfix}`,
        };
        const budgetB = {
          ...Budgets.getDefaultBudget(),
          allocated: TEST_VALUES.INITIAL_ALLOCATION,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
          fiscalYearId: f.get(R.FINANCE_A).fiscalYear.id,
          fundId: fundB.id,
        };

        return Funds.createViaApi(fundB)
          .then(() => f.set(R.FUND_B, fundB, () => Funds.deleteFundViaApi(fundB.id, false)))
          .then(() => Budgets.createViaApi(budgetB))
          .then((createdBudget) => f.set(R.BUDGET_B, createdBudget, () => Budgets.deleteViaApi(createdBudget.id, false)));
      })
      .step((f) => NewOrganization.createViaApi({
        ...NewOrganization.getDefaultOrganization(),
        name: `${TEST_VALUES.VENDOR_NAME}_${postfix}`,
        code: `${TEST_VALUES.VENDOR_CODE}_${postfix}`,
      }).then((organization) => f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(organization.id))))
      // Precondition 5: Create, open, and close Order 1 with two separately funded lines.
      .step((f) => {
        return createOrder(f, {
          key: R.ORDER_1,
          title: `${TEST_VALUES.ORDER_PREFIX}_1`,
          lineDistributions: [
            [createFundDistribution(f.get(R.FINANCE_A).fund, 100)],
            [createFundDistribution(f.get(R.FUND_B), 100)],
          ],
        });
      })
      // Precondition 6: Create, open, and close Order 2 with a 50/50 fund distribution.
      .step((f) => {
        return createOrder(f, {
          key: R.ORDER_2,
          title: `${TEST_VALUES.ORDER_PREFIX}_2`,
          lineDistributions: [
            [
              createFundDistribution(f.get(R.FINANCE_A).fund, 50),
              createFundDistribution(f.get(R.FUND_B), 50),
            ],
          ],
        });
      })
      // Precondition 7: Create, open, and close Order 3 with only Fund A.
      .step((f) => {
        return createOrder(f, {
          key: R.ORDER_3,
          title: `${TEST_VALUES.ORDER_PREFIX}_3`,
          lineDistributions: [[createFundDistribution(f.get(R.FINANCE_A).fund, 100)]],
        });
      })
      // Precondition 8: Reduce both current budget allocations by $260, leaving $40 in each fund.
      .step((f) => {
        const transactionsToCreate = [f.get(R.FINANCE_A).fund.id, f.get(R.FUND_B).id].map(
          (fundId) => ({
            transactionType: TRANSACTION_TYPES.ALLOCATION,
            source: TRANSACTION_SOURCE_TYPES.USER,
            currency: flow.get(R.LOCALE).currency,
            amount: TEST_VALUES.REDUCE_ALLOCATION,
            fromFundId: fundId,
            fiscalYearId: flow.get(R.FINANCE_A).fiscalYear.id,
          }),
        );

        Transactions.createBatchTransactionsViaApi(transactionsToCreate);
      })
      // Precondition 9: Grant only Orders edit and Order Reopen execute permissions.
      .step((f) => cy
        .createTempUser([
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersReopenPurchaseOrders.gui,
        ])
        .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId))))
      // Precondition 10: Open Orders with Order 1 in the search results.
      .step((f) => waitForFilters(() => cy.login(f.get(R.USER).username, f.get(R.USER).password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      })).then(() => waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, f.get(R.ORDER_1).poNumber))));
  });

  after('Delete C1464357 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1464357 Reopen order shows insufficient funds error',
    { tags: ['extendedPath', 'thunderjet', 'C1464357'] },
    () => {
      const { order1, order2, order3, financeA, fundB } = flow.ctx();
      const fundCodes = {
        A: financeA.fund.code,
        B: fundB.code,
      };

      cy.log('Step 1. Open Order 1 and verify its closed summary');
      Orders.selectFromResultsList(order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.verifyOrderTitle(OrderStates.purchaseOrderPaneTitle(order1.poNumber));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
            value: expectedCurrency(TEST_VALUES.LINE_PRICE * 2),
          },
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED,
            value: expectedCurrency(0),
          },
        ],
      });

      cy.log('Step 2. Reopen Order 1 and verify the insufficient funds error');
      verifyReopenFailure({
        order: order1,
        fundCodes: [fundCodes.A, fundCodes.B],
        totalPrice: TEST_VALUES.LINE_PRICE * 2,
      });
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 3. Reopen Order 2 and verify the insufficient funds error');
      waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order2.poNumber));
      Orders.selectFromResultsList(order2.poNumber);
      OrderDetails.waitLoading();
      verifyReopenFailure({
        order: order2,
        fundCodes: [fundCodes.A, fundCodes.B],
        totalPrice: TEST_VALUES.LINE_PRICE,
      });
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 4. Reopen Order 3 and verify the Fund A insufficient funds error');
      waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order3.poNumber));
      Orders.selectFromResultsList(order3.poNumber);
      OrderDetails.waitLoading();
      verifyReopenFailure({
        order: order3,
        fundCodes: [fundCodes.A],
        totalPrice: TEST_VALUES.LINE_PRICE,
      });
      InteractorsTools.closeAllVisibleCallouts();
    },
  );
});
