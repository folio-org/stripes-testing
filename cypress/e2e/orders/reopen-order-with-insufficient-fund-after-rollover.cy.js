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
} from '../../support/constants';
import {
  Budgets,
  Funds,
  FiscalYears,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderStates from '../../support/fragments/orders/orderStates';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';
import InteractorsTools from '../../support/utils/interactorsTools';
import DateTools from '../../support/utils/dateTools';
import { formatCurrency } from '../../support/utils/numberTools';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';

const { PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const R = {
  FY1: 'fiscalYear1',
  FY2: 'fiscalYear2',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  EXPENSE_CLASS: 'expenseClass',
  ORGANIZATION: 'organization',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  USER: 'user',
};

const TEST_VALUES = {
  BUDGET_ALLOCATION: 100,
  ROLLOVER_ADJUSTMENT: '-50',
  LINE_PRICE: 100,
  VENDOR_NAME: 'AT_C1464358_Vendor',
  VENDOR_CODE: 'AT_C1464358',
  ORDER_PREFIX: 'AT_C1464358_Order',
  CURRENCY: { locale: 'en-US', currency: 'USD' },
  FUNDS_PARAMETER_KEY: 'finance.funds',
};

const expectedCurrency = (value) => formatCurrency(value, TEST_VALUES.CURRENCY);

const parseFundCodes = (value) => value
  .replace(/^\[|\]$/g, '')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean);

const createFundDistribution = (fund, value, expenseClassId) => ({
  code: fund.code,
  fundId: fund.id,
  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
  value,
  ...(expenseClassId ? { expenseClassId } : {}),
});

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();
  const series = getRandomLetters(2);

  const waitForResults = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
    trigger,
  });

  const createOrder = (f, { key, title, fundDistribution }) => {
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
        .then(({ body }) => OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: `${title}_${postfix}`,
            acquisitionMethod: body.acquisitionMethods[0].id,
            purchaseOrderId: createdOrder.id,
            listUnitPrice: TEST_VALUES.LINE_PRICE,
            fundDistribution: [fundDistribution],
            orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            locations: [],
            physical: { createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE },
          }),
        ))
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

  const verifyReopenFailure = ({ order, fundCodes }) => {
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
      expect(parseFundCodes(fundsParameter.value)).to.have.members(fundCodes);
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
          value: expectedCurrency(TEST_VALUES.LINE_PRICE),
        },
        { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: expectedCurrency(0) },
      ],
    });
  };

  before('Create C1464358 preconditions', () => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    flow
      .step((f) => {
        cy.log(
          'Precondition 1. Create two consecutive fiscal years with the same alphabetical code part; FY1 includes today',
        );

        const fiscalYear1 = {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `FYA${series}${new Date().getFullYear()}`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        };
        const fiscalYear2 = {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `FYA${series}${new Date().getFullYear() + 1}`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        };

        return FiscalYears.createViaApi(fiscalYear1)
          .then((createdFY1) => f.set(R.FY1, createdFY1, () => FiscalYears.deleteFiscalYearViaApi(createdFY1.id, false)))
          .then(() => FiscalYears.createViaApi(fiscalYear2))
          .then((createdFY2) => f.set(R.FY2, createdFY2, () => Budgets.getBudgetViaApi({ query: `fiscalYearId==${createdFY2.id}` })
            .then(({ budgets = [] }) => budgets.forEach(({ id }) => Budgets.deleteViaApi(id, false)))
            .then(() => FiscalYears.deleteFiscalYearViaApi(createdFY2.id, false))));
      })
      .step((f) => {
        cy.log(
          'Precondition 2. Create an active restricted ledger for FY1 with both enforcement limits enabled',
        );

        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
          fiscalYearOneId: f.get(R.FY1).id,
          restrictEncumbrance: true,
          restrictExpenditures: true,
        }).then((ledger) => f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false)));
      })
      .step((f) => {
        cy.log(
          'Precondition 3. Create active Fund A and Fund B with $100 FY1 budgets; Fund B has one active expense class',
        );

        return ExpenseClasses.createExpenseClassViaApi(
          ExpenseClasses.getDefaultExpenseClass(),
        ).then((expenseClass) => {
          f.set(R.EXPENSE_CLASS, expenseClass, () => ExpenseClasses.deleteExpenseClassViaApi(expenseClass.id));
          const createFund = (fundKey, budgetKey, fundProperties, expenseClasses = []) => {
            const fund = {
              ...Funds.getDefaultFund(),
              ...fundProperties,
              ledgerId: f.get(R.LEDGER).id,
            };
            const budget = {
              ...Budgets.getDefaultBudget(),
              budgetStatus: BUDGET_STATUSES.ACTIVE,
              allocated: TEST_VALUES.BUDGET_ALLOCATION,
              fiscalYearId: f.get(R.FY1).id,
              fundId: fund.id,
            };

            return Funds.createViaApi(fund)
              .then(({ fund: createdFund }) => f.set(fundKey, createdFund, () => Funds.deleteFundViaApi(createdFund.id, false)))
              .then(() => Budgets.createViaApi(budget))
              .then((createdBudget) => Budgets.updateBudgetViaApi({
                ...createdBudget,
                statusExpenseClasses: expenseClasses.map(({ id }) => ({
                  status: BUDGET_STATUSES.ACTIVE,
                  expenseClassId: id,
                })),
              }))
              .then((updatedBudget) => f.set(budgetKey, updatedBudget, () => Budgets.deleteViaApi(updatedBudget.id, false)));
          };

          return createFund(R.FUND_A, R.BUDGET_A, { fundStatus: FUND_STATUSES.ACTIVE }).then(() => createFund(R.FUND_B, R.BUDGET_B, { fundStatus: FUND_STATUSES.ACTIVE }, [expenseClass]));
        });
      })
      .step((f) => NewOrganization.createViaApi({
        ...NewOrganization.getDefaultOrganization(),
        name: `${TEST_VALUES.VENDOR_NAME}_${postfix}`,
        code: `${TEST_VALUES.VENDOR_CODE}_${postfix}`,
      }).then((organization) => f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(organization.id))))
      .step((f) => {
        cy.log(
          'Precondition 4. Create, open, and close one-time Order 1 with Fund A and re-encumber enabled',
        );

        return createOrder(f, {
          key: R.ORDER_1,
          title: `${TEST_VALUES.ORDER_PREFIX}_1`,
          fundDistribution: createFundDistribution(f.get(R.FUND_A), 100),
        });
      })
      .step((f) => {
        cy.log(
          'Precondition 5. Create, open, and close one-time Order 2 with Fund B and the active expense class',
        );

        return createOrder(f, {
          key: R.ORDER_2,
          title: `${TEST_VALUES.ORDER_PREFIX}_2`,
          fundDistribution: createFundDistribution(f.get(R.FUND_B), 100, f.get(R.EXPENSE_CLASS).id),
        });
      })
      .step((f) => {
        cy.log(
          'Precondition 6: Perform the FY1-to-FY2 rollover with the specified budget and one-time encumbrance settings.',
        );

        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger: f.get(R.LEDGER),
          fromFiscalYear: f.get(R.FY1),
          toFiscalYear: f.get(R.FY2),
          restrictEncumbrance: true,
          restrictExpenditures: true,
          needCloseBudgets: true,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              adjustAllocation: Number(TEST_VALUES.ROLLOVER_ADJUSTMENT),
              rolloverBudgetValue: 'None',
              addAvailableTo: 'Allocation',
              setAllowances: false,
            },
          ],
          encumbrancesRollover: [],
        });

        return LedgerRollovers.createLedgerRolloverViaApi(rollover);
      })
      .step((f) => {
        cy.log('Precondition 7: Change FY dates so FY2 includes today after the rollover.');

        return FiscalYears.updateFiscalYearViaApi({
          ...f.get(R.FY1),
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        }).then(() => FiscalYears.updateFiscalYearViaApi({
          ...f.get(R.FY2),
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        }));
      })
      .step((f) => {
        cy.log('Precondition 8: Grant only Orders edit and Order Reopen execute permissions.');

        return cy
          .createTempUser([
            Permissions.uiOrdersEdit.gui,
            Permissions.uiOrdersReopenPurchaseOrders.gui,
          ])
          .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
      })
      .step((f) => {
        cy.log('Precondition 9: Open Orders with Order 1 in the search results.');

        return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  });

  after('Delete C1464358 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1464358 Reopen order shows insufficient fund error after rollover',
    { tags: ['extendedPath', 'thunderjet', 'C1464358'] },
    () => {
      const { order1, order2, fundA, fundB } = flow.ctx();

      waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order1.poNumber));

      cy.log('Step 1. Open Order 1 and verify its closed summary');
      Orders.selectFromResultsList(order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.verifyOrderTitle(OrderStates.purchaseOrderPaneTitle(order1.poNumber));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          {
            key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE,
            value: expectedCurrency(TEST_VALUES.LINE_PRICE),
          },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: expectedCurrency(0) },
        ],
      });

      cy.log('Step 2. Reopen Order 1 and verify the Fund A insufficient funds error');
      verifyReopenFailure({ order: order1, fundCodes: [fundA.code] });

      cy.log('Step 3. Navigate to Order 2 and verify the Fund B insufficient funds error');
      waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, order2.poNumber));
      Orders.selectFromResultsList(order2.poNumber);
      OrderDetails.waitLoading();
      verifyReopenFailure({ order: order2, fundCodes: [fundB.code] });
    },
  );
});
