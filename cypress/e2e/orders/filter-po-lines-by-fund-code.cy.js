import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LIST_ASSERTION_MODES,
  ORDER_LINE_FILTER_LABELS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderHelper,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const LINES_LIMIT = 2;
const FUND_CODE_FILTER = ORDER_LINE_FILTER_LABELS.FUND_CODE;

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    acquisitionUnit: AcquisitionUnits.getDefaultAcquisitionUnit({
      protectRead: true,
      protectUpdate: false,
      protectCreate: false,
      protectDelete: false,
    }),
    fiscalYear: {},
    ledger: Ledgers.getDefaultLedger(),
    vendor: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C590822_Vendor_${randomPostfix}`,
    },
    fundA: {
      ...Funds.getDefaultFund(),
      name: `AT_C590822_FundA_${randomPostfix}`,
      code: `AT-C590822-A-${randomPostfix}`,
    },
    fundB: {
      ...Funds.getDefaultFund(),
      name: `AT_C590822_FundB_${randomPostfix}`,
      code: `AT-C590822-B-${randomPostfix}`,
    },
    fundC: {
      ...Funds.getDefaultFund(),
      name: `AT_C590822_FundC_${randomPostfix}`,
      code: `AT-C590822-C-${randomPostfix}`,
    },
    orderLineTitles: {
      line1A: `AT_C590822_Line1A_${randomPostfix}`,
      line1B: `AT_C590822_Line1B_${randomPostfix}`,
      line2: `AT_C590822_Line2_${randomPostfix}`,
      line3: `AT_C590822_Line3_${randomPostfix}`,
      line4: `AT_C590822_Line4_${randomPostfix}`,
      line5: `AT_C590822_Line5_${randomPostfix}`,
    },
    budgetIds: [],
    orders: [],
    user: {},
  };

  const createFundWithBudget = (fund, acqUnitIds = []) => {
    return Funds.createViaApi({
      ...fund,
      acqUnitIds,
      ledgerId: testData.ledger.id,
    }).then(({ fund: createdFund }) => {
      fund.id = createdFund.id;

      return Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 500,
        fundId: createdFund.id,
        fiscalYearId: testData.fiscalYear.id,
      }).then((budget) => {
        testData.budgetIds.push(budget.id);
      });
    });
  };

  const getFundDistribution = (funds = []) => {
    return funds.map((fund) => ({
      fundId: fund.id,
      code: fund.code,
      distributionType: 'percentage',
      value: 100 / funds.length,
    }));
  };

  const createOrderWithLines = (orderLinesParams = []) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.vendor.id }),
    ).then((order) => {
      testData.orders.push(order);

      return cy
        .wrap(orderLinesParams)
        .each(({ title, funds }) => {
          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              title,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 100,
              poLineEstimatedPrice: 100,
              fundDistribution: getFundDistribution(funds),
            }),
          );
        })
        .then(() => order);
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    // Precondition 3: "Purchase order lines limit" should be set with "2"
    OrderLinesLimit.setPOLLimitViaApi(LINES_LIMIT);

    // Precondition 1: Acquisition unit with "View" checkbox checked, admin user is added to it
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
    cy.getAdminUserId().then((adminUserId) => {
      AcquisitionUnits.assignUserViaApi(adminUserId, testData.acquisitionUnit.id);
    });

    // Precondition 2: Three active funds "Fund A", "Fund B" and "Fund C" with current budgets
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({
        ...testData.ledger,
        fiscalYearOneId: testData.fiscalYear.id,
      }).then(() => {
        createFundWithBudget(testData.fundA)
          .then(() => createFundWithBudget(testData.fundB))
          .then(() => createFundWithBudget(testData.fundC, [testData.acquisitionUnit.id]));
      });
    });

    Organizations.createOrganizationViaApi(testData.vendor).then((vendorId) => {
      testData.vendor.id = vendorId;

      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }).then((acquisitionMethodResponse) => {
        testData.acquisitionMethodId = acquisitionMethodResponse.body.acquisitionMethods[0].id;

        // Precondition 4: Order #1 with two PO lines ("Fund A" and "Fund B"), opened
        createOrderWithLines([
          { title: testData.orderLineTitles.line1A, funds: [testData.fundA] },
          { title: testData.orderLineTitles.line1B, funds: [testData.fundB] },
        ])
          .then((order) => {
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });

            // Precondition 5: Order #2 with one PO line ("Fund A"), remains "Pending"
            return createOrderWithLines([
              { title: testData.orderLineTitles.line2, funds: [testData.fundA] },
            ]);
          })
          .then(() => {
            // Precondition 6: Order #3 with one PO line ("Fund B"), opened and then cancelled
            return createOrderWithLines([
              { title: testData.orderLineTitles.line3, funds: [testData.fundB] },
            ]).then((order) => {
              Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
              Orders.updateOrderViaApi({
                ...order,
                workflowStatus: ORDER_STATUSES.CLOSED,
                closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
              });
            });
          })
          .then(() => {
            // Precondition 7: Order #4 with one PO line ("Fund A" and "Fund B"), remains "Pending"
            return createOrderWithLines([
              {
                title: testData.orderLineTitles.line4,
                funds: [testData.fundA, testData.fundB],
              },
            ]);
          })
          .then(() => {
            // Precondition 8: Order #5 with one PO line without funds, opened
            return createOrderWithLines([
              { title: testData.orderLineTitles.line5, funds: [] },
            ]).then((order) => {
              Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
            });
          });
      });
    });

    // Precondition 9: User with "Orders: Can view Orders and Order lines" permission
    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      OrderHelper.interceptGetOrderLines();
      OrderHelper.interceptCustomFields();
      FinanceHelper.interceptFundsRequest();

      // Precondition 11: User is on "Orders" app (search toggle is on "Order lines" option)
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderLines();
      OrderLines.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(1);
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
    testData.budgetIds.forEach((budgetId) => Budgets.deleteViaApi(budgetId, false));
    [testData.fundA, testData.fundB, testData.fundC].forEach((fund) => Funds.deleteFundViaApi(fund.id, false));
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
    Organizations.deleteOrganizationViaApi(testData.vendor.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C590822 Filter PO lines by "Fund code" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C590822', 'nonParallel'] },
    () => {
      // Wait for resources to be loaded: the loading state is blocking the filters
      FinanceHelper.waitForFundsRequestCompletion();
      OrderHelper.waitForCustomFieldsQueryCompleted();

      // Step 1: Click "Reset all" button on "Search & filter" pane (if active)
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 2: Expand "Fund code" accordion on "Search & filter" pane
      OrderLines.assertFundCodeFilterValues([]);

      // Step 3: Click the dropdown in "Fund code" accordion
      OrderLines.assertFundCodeFilterOptions([testData.fundA.code, testData.fundB.code]);
      OrderLines.assertFundCodeFilterOptions([testData.fundC.code], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });

      // Step 4: Select "Fund A" from the list
      OrderLines.filterByFundCodes([testData.fundA.code]);
      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderLines.assertFundCodeFilterValues([testData.fundA.code]);
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line5,
      ]);

      // Step 5: Clear "Fund code" field by clicking "X" button next to "Fund code" accordion
      OrderLines.clearFilter(FUND_CODE_FILTER);
      OrderLines.assertFundCodeFilterValues([]);
      OrderLines.assertNoFiltersApplied();

      // Step 6: Click the dropdown in "Fund code" accordion and select "Fund B" from the list
      OrderLines.filterByFundCodes([testData.fundB.code]);
      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderLines.assertFundCodeFilterValues([testData.fundB.code]);
      OrderLines.assertFundCodeFilterValues([testData.fundA.code], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line5,
      ]);

      // Step 7: Click the dropdown in "Fund code" accordion and select "Fund A" from the list
      OrderLines.filterByFundCodes([testData.fundA.code]);
      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderLines.assertFundCodeFilterValues([testData.fundA.code, testData.fundB.code]);
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([testData.orderLineTitles.line5]);

      // Step 8: Remove "Fund B" facet by clicking "X" next to it
      OrderLines.removeMultiSelectChips(FUND_CODE_FILTER, [testData.fundB.code]);
      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderLines.assertFundCodeFilterValues([testData.fundA.code]);
      OrderLines.assertFundCodeFilterValues([testData.fundB.code], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line5,
      ]);
    },
  );
});
