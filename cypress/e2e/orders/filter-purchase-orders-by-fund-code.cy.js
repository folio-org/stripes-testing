import { including } from '@interactors/html';
import uuid from 'uuid';

import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LIST_ASSERTION_MODES,
  ORDER_FILTER_LABELS,
  ORDER_RESULTS_LIST_COLUMN_LABELS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../support/fragments/finance';
import { BasicOrderLine, OrderHelper, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import { ExecutionFlowManager } from '../../support/utils';

const R = {
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  FUND_C: 'fundC',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  BUDGET_C: 'budgetC',
  ORG: 'organization',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  ACQUISITION_UNIT: 'acquisitionUnit',
  LOCALE: 'locale',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  ORDER_3: 'order3',
  ORDER_4: 'order4',
  ORDER_5: 'order5',
  ORDER_LINE_1_1: 'orderLine1_1',
  ORDER_LINE_1_2: 'orderLine1_2',
  ORDER_LINE_2: 'orderLine2',
  ORDER_LINE_3: 'orderLine3',
  ORDER_LINE_4: 'orderLine4',
  ORDER_LINE_5: 'orderLine5',
  USER: 'user',
};

describe('Orders', () => {
  describe('Filter by Fund code', () => {
    const flow = new ExecutionFlowManager();

    before('Create C594360 preconditions', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

      const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

      flow
        .step(steps.createAcquisitionUnit) // Precondition 1: Acquisition unit with "View" checkbox checked
        .step(steps.createFiscalYear) // Support: Fiscal Year required for Budgets
        .step(steps.createLedger) // Support: Ledger required for Funds
        .step(steps.createFundsAndBudgets) // Precondition 2: Three active funds A, B, C with budgets and allocation
        .step(steps.setPOLineLimitViaApi) // Precondition 3: Purchase order lines limit set to 2
        .step(steps.createOrganization) // Precondition 7 support: Vendor/source data for orders
        .step(steps.fetchLocation) // Precondition 7 support: Location required for PO lines
        .step(steps.fetchMaterialType) // Precondition 7 support: Material type required for PO lines
        .step(steps.fetchAcquisitionMethod) // Precondition 7 support: Acquisition method for created PO lines
        .step(steps.createOrder1WithTwoLines) // Precondition 4: Order #1 (Open) with 2 lines: Fund A and Fund B
        .step(steps.createOrder2WithOneLine) // Precondition 5: Order #2 (Pending) with 1 line: Fund A
        .step(steps.createOrder3WithOneLineAndCancel) // Precondition 6: Order #3 (Open, cancelled) with 1 line: Fund B
        .step(steps.createOrder4WithOneLine) // Precondition 7: Order #4 (Open) with 1 line: Fund A and Fund B
        .step(steps.createOrder5WithOneLine) // Precondition 8: Order #5 (Pending) with 1 line: NO assigned funds
        .step(steps.createAuthorizedUser) // Precondition 9: User (Staff) with "Can view Orders and Order lines" permission
        .step(steps.loginAsAuthorizedUser); // Precondition 11: User is on Orders app
    });

    after('Delete C594360 data (what can be deleted)', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C594360 Filter purchase orders by "Fund code" filter (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C594360'] },
      () => {
        const { fundA, fundB, fundC, order1, order2, order3, order4 } = flow.ctx();

        const FUND_CODE_FILTER = ORDER_FILTER_LABELS.FUND_CODE;
        const PO_NUMBER_COLUMN = ORDER_RESULTS_LIST_COLUMN_LABELS.PO_NUMBER;

        // Wait for resources to be loaded: the loading state is blocking the filters.
        FinanceHelper.waitForFundsRequestCompletion();
        OrderHelper.waitForCustomFieldsQueryCompleted();

        /* STEP 1: Click "Reset all" button on Search & filter pane */
        // Expected: Results cleared, empty message displayed
        cy.log('STEP 1: Click "Reset all" button on Search & filter pane');
        Orders.resetAllFilters();

        /* STEP 2: Expand "Fund code" accordion on Search & filter pane */
        // Expected: Accordion expanded and contains empty dropdown (editable)
        cy.log('STEP 2: Expand "Fund code" accordion on Search & filter pane');
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, []);

        /* STEP 3: Click the dropdown in "Fund code" accordion */
        // Expected: Dropdown expanded with all available funds (Fund A, Fund B present; Fund C NOT present)
        cy.log('STEP 3: Click the dropdown in "Fund code" accordion');
        Orders.assertFundCodeFilterOptions([fundA.code, fundB.code]);
        Orders.assertFundCodeFilterOptions([fundC.code], { mode: LIST_ASSERTION_MODES.ABSENT });

        /* STEP 4: Select "Fund A" from the list */
        // Expected: Fund A facet appears, Orders #1, #2, #4 displayed
        cy.log('STEP 4: Select "Fund A" from the list');
        Orders.filterByFundCodes([fundA.code]);
        OrderHelper.waitForOrdersQueryCompleted();
        Orders.assertFundCodeFilterValues([fundA.code]);
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        /* STEP 5: Clear "Fund code" field by clicking "X" button */
        // Expected: Fund code field cleared, results cleared, empty message displayed
        cy.log('STEP 5: Clear "Fund code" field by clicking "X" button');
        Orders.clearFilter(FUND_CODE_FILTER);
        Orders.assertNoFiltersApplied();

        /* STEP 6: Select "Fund B" from the list */
        // Expected: Fund B facet appears, Orders #1, #3, #4 displayed
        cy.log('STEP 6: Select "Fund B" from the list');
        Orders.filterByFundCodes([fundB.code]);
        Orders.assertFundCodeFilterValues([fundB.code]);
        Orders.assertFundCodeFilterValues([fundA.code], { mode: LIST_ASSERTION_MODES.ABSENT });
        OrderHelper.waitForOrdersQueryCompleted();
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: including(order3.poNumber) }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        /* STEP 7: Select "Fund A" additionally */
        // Expected: Fund A and Fund B facets displayed, Orders #1, #2, #3, #4 displayed
        cy.log('STEP 7: Select "Fund A" additionally');
        Orders.filterByFundCodes([fundA.code]);
        OrderHelper.waitForOrdersQueryCompleted();
        Orders.assertFundCodeFilterValues([fundA.code, fundB.code]);
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: including(order3.poNumber) }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        /* STEP 8: Remove "Fund B" facet by clicking "X" next to it */
        // Expected: Fund B facet disappears, Fund A facet remains, Orders #1, #2, #4 displayed
        cy.log('STEP 8: Remove "Fund B" facet by clicking "X" next to it');
        Orders.removeMultiSelectChips(FUND_CODE_FILTER, [fundB.code]);
        OrderHelper.waitForOrdersQueryCompleted();
        Orders.assertFundCodeFilterValues([fundA.code]);
        Orders.assertFundCodeFilterValues([fundB.code], { mode: LIST_ASSERTION_MODES.ABSENT });
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);
      },
    );
  });
});

function getPreconditionSteps() {
  /* Support functions */

  const createOrder = (flow, orderKey, orderType) => {
    return Orders.createOrderViaApi({
      id: uuid(),
      vendor: flow.get(R.ORG).id,
      notes: [orderKey],
      orderType,
      ...(orderType === ORDER_TYPES.ONGOING && {
        ongoing: {
          isSubscription: false,
          manualRenewal: false,
        },
      }),
    }).then((entity) => flow.set(orderKey, entity, () => Orders.deleteOrderViaApi(entity.id, false)));
  };

  const createOrderLine = (flow, params) => {
    const { orderKey, orderLineKey, fundDistribution, fundKeys, amount } = params;

    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId: flow.get(orderKey).id,
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      fundDistribution:
        fundDistribution ||
        fundKeys.map((fundKey) => ({
          fundId: flow.get(fundKey).id,
          code: flow.get(fundKey).code,
          value: 100 / fundKeys.length,
        })),
      locations: [{ locationId: flow.get(R.LOCATION).id, quantity: 1, quantityPhysical: 1 }],
      cost: {
        listUnitPrice: amount,
        currency: flow.get(R.LOCALE).currency,
        quantityPhysical: 1,
        poLineEstimatedPrice: amount,
      },
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORG).id,
        volumes: [],
      },
    }).then((entity) => flow.set(orderLineKey, entity, () => OrderLines.deleteOrderLineViaApi(entity.id, false)));
  };

  const openOrder = (order) => {
    Orders.updateOrderViaApi({
      ...order,
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  /* STEPS */

  const createAcquisitionUnit = (flow) => {
    return AcquisitionUnits.createAcquisitionUnitViaApi(
      AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    ).then((entity) => flow.set(R.ACQUISITION_UNIT, entity, () => AcquisitionUnits.deleteAcquisitionUnitViaApi(entity.id, false)));
  };

  const createFiscalYear = (flow) => {
    return FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then((entity) => flow.set(R.FISCAL_YEAR, entity, () => FiscalYears.deleteFiscalYearViaApi(entity.id, false)));
  };

  const createLedger = (flow) => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: flow.get(R.FISCAL_YEAR).id,
    }).then((entity) => flow.set(R.LEDGER, entity, () => Ledgers.deleteLedgerViaApi(entity.id, false)));
  };

  const createFundsAndBudgets = (flow) => {
    const cleanupFund = (fundId) => Funds.deleteFundViaApi(fundId, false);

    const createFundStep = (key, nameSuffix, acqUnitIds) => {
      const defaultFund = Funds.getDefaultFund();

      return Funds.createViaApi({
        ...defaultFund,
        acqUnitIds,
        ledgerId: flow.get(R.LEDGER).id,
        name: `autotest_fund_${nameSuffix}_${Date.now()}`,
        code: `${nameSuffix}-${defaultFund.code}`,
      }).then((entity) => flow.set(key, entity.fund, cleanupFund.bind(null, entity.fund.id)));
    };

    const createBudgetStep = (budgetKey, fundKey) => {
      const cleanupBudget = (budgetId) => Budgets.deleteViaApi(budgetId, false);

      return Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 500,
        fundId: flow.get(fundKey).id,
        fiscalYearId: flow.get(R.FISCAL_YEAR).id,
      }).then((entity) => flow.set(budgetKey, entity, cleanupBudget.bind(null, entity.id)));
    };

    return createFundStep(R.FUND_A, 'A')
      .then(() => createFundStep(R.FUND_B, 'B'))
      .then(() => createFundStep(R.FUND_C, 'C', [flow.get(R.ACQUISITION_UNIT).id]))
      .then(() => createBudgetStep(R.BUDGET_A, R.FUND_A))
      .then(() => createBudgetStep(R.BUDGET_B, R.FUND_B))
      .then(() => createBudgetStep(R.BUDGET_C, R.FUND_C));
  };

  const setPOLineLimitViaApi = (flow) => {
    OrderLinesLimit.setPOLLimitViaApi(2);
    cy.then(() => flow.toCleanup(R.POL_LIMIT, () => OrderLinesLimit.setPOLLimitViaApi(1)));
  };

  const createOrganization = (flow) => {
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      name: `autotest_org_${Date.now()}`,
    };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORG, { ...organization, id: organizationId }, (entity) => Organizations.deleteOrganizationViaApi(entity.id, false)));
  };

  const fetchLocation = (flow) => {
    return cy.getLocations({ limit: 1 }).then((location) => flow.set(R.LOCATION, location));
  };

  const fetchMaterialType = (flow) => {
    return cy
      .getDefaultMaterialType()
      .then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => flow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
  };

  const createOrder1WithTwoLines = (flow) => {
    // Order #1 (Open) with 2 lines: Fund A and Fund B
    return createOrder(flow, R.ORDER_1, ORDER_TYPES.ONE_TIME_API)
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_1,
        orderLineKey: R.ORDER_LINE_1_1,
        fundKeys: [R.FUND_A],
        amount: 100,
      }))
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_1,
        orderLineKey: R.ORDER_LINE_1_2,
        fundKeys: [R.FUND_B],
        amount: 150,
      }))
      .then(() => openOrder(flow.get(R.ORDER_1)));
  };

  const createOrder2WithOneLine = (flow) => {
    // Order #2 (Pending) with 1 line: Fund A
    return createOrder(flow, R.ORDER_2, ORDER_TYPES.ONE_TIME_API).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_2,
      orderLineKey: R.ORDER_LINE_2,
      fundKeys: [R.FUND_A],
      amount: 120,
    }));
  };

  const createOrder3WithOneLineAndCancel = (flow) => {
    // Order #3 (Open, cancelled) with 1 line: Fund B
    return createOrder(flow, R.ORDER_3, ORDER_TYPES.ONE_TIME_API)
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_3,
        orderLineKey: R.ORDER_LINE_3,
        fundKeys: [R.FUND_B],
        amount: 130,
      }))
      .then(() => flow.get(R.ORDER_3))
      .then(() => Orders.updateOrderViaApi({
        ...flow.get(R.ORDER_3),
        workflowStatus: ORDER_STATUSES.CLOSED,
        closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
      }));
  };

  const createOrder4WithOneLine = (flow) => {
    // Order #4 (Open) with 1 line: Fund A and Fund B
    return createOrder(flow, R.ORDER_4, ORDER_TYPES.ONE_TIME_API)
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_4,
        orderLineKey: R.ORDER_LINE_4,
        fundKeys: [R.FUND_A, R.FUND_B],
        amount: 160,
      }))
      .then(() => openOrder(flow.get(R.ORDER_4)));
  };

  const createOrder5WithOneLine = (flow) => {
    // Order #5 (Pending) with 1 line: NO assigned funds
    return createOrder(flow, R.ORDER_5, ORDER_TYPES.ONE_TIME_API).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_5,
      orderLineKey: R.ORDER_LINE_5,
      fundDistribution: [],
      amount: 140,
    }));
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([permissions.uiOrdersView.gui])
      .then((user) => flow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.USER);

    OrderHelper.interceptGetOrders();
    OrderHelper.interceptCustomFields();
    FinanceHelper.interceptFundsRequest();

    return cy.login(user.username, user.password, {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
  };

  return {
    createAcquisitionUnit,
    createFiscalYear,
    createLedger,
    createFundsAndBudgets,
    setPOLineLimitViaApi,
    createOrganization,
    fetchLocation,
    fetchMaterialType,
    fetchAcquisitionMethod,
    createOrder1WithTwoLines,
    createOrder2WithOneLine,
    createOrder3WithOneLineAndCancel,
    createOrder4WithOneLine,
    createOrder5WithOneLine,
    createAuthorizedUser,
    loginAsAuthorizedUser,
  };
}
