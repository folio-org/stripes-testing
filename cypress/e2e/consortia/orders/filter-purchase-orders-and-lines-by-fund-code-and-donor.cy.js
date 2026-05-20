import uuid from 'uuid';

import {
  DEFAULT_WAIT_TIME,
  LIST_ASSERTION_MODES,
  ORDER_FILTER_LABELS,
  ORDER_LINE_FILTER_LABELS,
  ORDER_LINE_RESULTS_LIST_COLUMNS,
  ORDER_RESULTS_LIST_COLUMN_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import Affiliations from '../../../support/dictionary/affiliations';
import permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderHelper,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { OrderLinesLimit } from '../../../support/fragments/settings/orders';
import { ExecutionFlowManager } from '../../../support/utils';
import { ConsortiumManagerSettings } from '../../../support/fragments/settings/consortium-manager';
import { getRandomLetters } from '../../../support/utils/stringTools';

const R = {
  ACTIVE_ADMIN: 'activeAdmin',
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  FUND_C: 'fundC',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  BUDGET_C: 'budgetC',
  ORG_DONOR_A: 'organizationDonorA',
  ORG_DONOR_B: 'organizationDonorB',
  ORG_VENDOR: 'organizationVendor',
  LINES_LIMIT: 'linesLimit',
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

const LINES_LIMIT = 2;
const PO_NUMBER_COLUMN = ORDER_RESULTS_LIST_COLUMN_LABELS.PO_NUMBER;
const POL_NUMBER_COLUMN = ORDER_LINE_RESULTS_LIST_COLUMNS.PO_LINE_NUMBER;

const interceptQueries = () => {
  /* These requests are sent by filters and should be intercepted */
  FinanceHelper.interceptFundsRequest();
  OrderHelper.interceptGetOrders();
  OrderHelper.interceptGetOrderLines();
  OrderHelper.interceptCustomFields();
  OrderHelper.interceptGetOrganizations();
  OrderHelper.interceptGetPrefixes();
  OrderHelper.interceptGetSuffixes();
  OrderHelper.interceptGetReasonsForClosure();
  OrderHelper.interceptGetTenantAddresses();
  OrderHelper.interceptGetSettingsEntries();
  OrderHelper.interceptGetTags();
  OrderHelper.interceptGetAcquisitionMethods();
  OrderHelper.interceptGetOrdersStorageSettings();
};

const waitForInitialOrdersQueriesCompleted = () => {
  FinanceHelper.waitForFundsRequestCompletion();
  OrderHelper.waitForCustomFieldsQueryCompleted();
  OrderHelper.waitForPrefixesQueryCompleted();
  OrderHelper.waitForSuffixesQueryCompleted();
  OrderHelper.waitForReasonsForClosureQueryCompleted();
  OrderHelper.waitForTenantAddressesQueryCompleted();
  OrderHelper.waitForSettingsEntriesQueryCompleted();
  OrderHelper.waitForTagsQueryCompleted();
};

const waitForInitialOrderLinesQueriesCompleted = () => {
  FinanceHelper.waitForFundsRequestCompletion();
  OrderHelper.waitForCustomFieldsQueryCompleted();
  OrderHelper.waitForPrefixesQueryCompleted();
  OrderHelper.waitForSuffixesQueryCompleted();
  OrderHelper.waitForSettingsEntriesQueryCompleted();
  OrderHelper.waitForTagsQueryCompleted();
  OrderHelper.waitForAcquisitionMethodsQueryCompleted();
};

const waitOrdersResultsLoading = () => {
  OrderHelper.waitForOrdersQueryCompleted();
  OrderHelper.waitForOrganizationsQueryCompleted();
  Orders.waitOrdersListLoading();
};

const waitForOrderLinesResultsLoading = () => {
  OrderHelper.waitForOrderLinesQueryCompleted();
  OrderHelper.waitForOrdersQueryCompleted();
  OrderLines.waitResultsListLoading();
};

describe('Orders', () => {
  describe('Filter by Fund code and Donor (ECS)', () => {
    const flow = new ExecutionFlowManager();

    before('Create C594361 preconditions', () => {
      const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

      flow
        .step(steps.setTenant(Affiliations.Consortia))
        .step(steps.enableCentralOrdering)
        .step(steps.setTenant(Affiliations.College))
        .step(steps.fetchLocaleSettings)
        .step(steps.createAcquisitionUnit) // Precondition 1: Acquisition unit with "View" checkbox checked
        .step(steps.createDonorOrganizations) // Precondition 2: Two donor organizations
        .step(steps.createVendorOrganization) // Precondition 3: One vendor organization
        .step(steps.createFiscalYear) // Support: Fiscal Year required for Budgets
        .step(steps.createLedger) // Support: Ledger required for Funds
        .step(steps.createFundsAndBudgets) // Precondition 4: Three active funds A, B, C with budgets and allocation
        .step(steps.setPOLineLimitViaApi) // Precondition 5: Purchase order lines limit set to 2
        .step(steps.fetchLocation) // Support: Location required for PO lines
        .step(steps.fetchMaterialType) // Support: Material type required for PO lines
        .step(steps.fetchAcquisitionMethod) // Support: Acquisition method for created PO lines
        .step(steps.createOrder1WithTwoLines) // Precondition 6: Order #1 with lines (Fund A + Donor A, Fund B + Donor B)
        .step(steps.createOrder2WithOneLine) // Precondition 7: Order #2 with line (Fund A + Donor A)
        .step(steps.createOrder3WithOneLine) // Precondition 8: Order #3 with line (Fund B + Donor B)
        .step(steps.createOrder4WithOneLine) // Precondition 9: Order #4 with line (Fund A + Fund B + Donor A + Donor B)
        .step(steps.createOrder5WithOneLine) // Precondition 10: Order #5 with line (NO funds, NO donors)
        .step(steps.createAuthorizedUserInMember) // Precondition 11: User with "Can view Orders" permission
        .step(steps.setTenant(Affiliations.Consortia))
        .step(steps.updateUserCentralTenantPermissions)
        .step(steps.setTenant(Affiliations.College))
        .step(steps.loginAsAuthorizedUser); // Precondition 12: User is on Orders app
    });

    after('Delete C594361 data (what can be deleted)', () => {
      cy.getCollegeAdminToken();
      flow.cleanup();
    });

    it(
      'C594361 Filter purchase orders and lines by "Fund code" and by "Donor" filter in member tenant (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C594361'] },
      () => {
        const {
          fundA,
          fundB,
          fundC,
          order1,
          order2,
          order3,
          order4,
          orderLine1_1, // eslint-disable-line camelcase
          orderLine1_2, // eslint-disable-line camelcase
          orderLine2,
          orderLine3,
          orderLine4,
          orderLine5,
          organizationDonorA,
          organizationDonorB,
          organizationVendor,
        } = flow.ctx();

        const FUND_CODE_FILTER = ORDER_FILTER_LABELS.FUND_CODE;

        // Wait for resources to be loaded: the loading state is blocking the filters.
        waitForInitialOrdersQueriesCompleted();

        cy.log('<--- STEP 1 --->');
        Orders.resetAllFilters();
        Orders.assertNoFiltersApplied();

        cy.log('<--- STEP 2 --->');
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, []);

        cy.log('<--- STEP 3 --->');
        Orders.assertFundCodeFilterOptions([fundA.code, fundB.code]);
        Orders.assertFundCodeFilterOptions([fundC.code], { mode: LIST_ASSERTION_MODES.ABSENT });

        cy.log('<--- STEP 4 --->');
        Orders.filterByFundCodes([fundA.code]);
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code]);
        waitOrdersResultsLoading();
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        cy.log('<--- STEP 5 --->');
        Orders.clearFilter(FUND_CODE_FILTER);
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, []);
        Orders.assertNoFiltersApplied();

        cy.log('<--- STEP 6 --->');
        Orders.filterByFundCodes([fundB.code]);
        waitOrdersResultsLoading();
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundB.code]);
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order3.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        cy.log('<--- STEP 7 --->');
        Orders.filterByFundCodes([fundA.code]);
        waitOrdersResultsLoading();
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code, fundB.code]);
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order3.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        cy.log('<--- STEP 8 --->');
        Orders.removeMultiSelectChips(FUND_CODE_FILTER, [fundB.code]);
        Orders.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code]);
        waitOrdersResultsLoading();
        Orders.assertOrdersResults([
          [{ column: PO_NUMBER_COLUMN, content: order4.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order2.poNumber }],
          [{ column: PO_NUMBER_COLUMN, content: order1.poNumber }],
        ]);

        cy.log('<--- STEP 9 --->');
        Orders.selectOrderLines();
        waitForInitialOrderLinesQueriesCompleted();
        OrderLines.waitLoading();
        OrderLines.resetFiltersIfActive();
        OrderLines.assertNoFiltersApplied();

        cy.log('<--- STEP 10 --->');
        OrderLines.assertFundCodeFilterOptions([fundA.code, fundB.code]);
        OrderLines.assertFundCodeFilterOptions([fundC.code], { mode: LIST_ASSERTION_MODES.ABSENT });

        cy.log('<--- STEP 11 --->');
        OrderLines.filterByFundCodes([fundA.code]);
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code]);
        waitForOrderLinesResultsLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);

        cy.log('<--- STEP 12 --->');
        OrderLines.clearFilter(FUND_CODE_FILTER);
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, []);
        OrderLines.assertNoFiltersApplied();

        cy.log('<--- STEP 13 --->');
        OrderLines.filterByFundCodes([fundB.code]);
        waitForOrderLinesResultsLoading();
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundB.code]);
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine3.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_2.poLineNumber }],
        ]);

        cy.log('<--- STEP 14 --->');
        OrderLines.filterByFundCodes([fundA.code]);
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code, fundB.code]);
        waitForOrderLinesResultsLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine3.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);

        cy.log('<--- STEP 15 --->');
        OrderLines.removeMultiSelectChips(FUND_CODE_FILTER, [fundB.code]);
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, [fundA.code]);
        waitForOrderLinesResultsLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);

        cy.log('<--- STEP 16 --->');
        OrderLines.resetFilters();
        OrderLines.assertMultiSelectFilterValues(FUND_CODE_FILTER, []);
        OrderLines.assertNoFiltersApplied();

        cy.log('<--- STEP 17 --->');
        OrderLines.filterByDonors([organizationDonorA.name]);
        waitForOrderLinesResultsLoading();

        cy.log('<--- STEP 18 --->');
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);

        cy.log('<--- STEP 19 --->');
        OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.DONOR);
        OrderLines.assertMultiSelectFilterValues(ORDER_LINE_FILTER_LABELS.DONOR, []);
        OrderLines.assertNoFiltersApplied();

        cy.log('<--- STEP 20 --->');
        OrderLines.filterByDonors([organizationDonorB.name]);
        waitForOrderLinesResultsLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine3.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_2.poLineNumber }],
        ]);

        cy.log('<--- STEP 21 --->');
        OrderLines.filterByDonors([organizationDonorA.name]);
        waitForOrderLinesResultsLoading();
        OrderLines.waitResultsListLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine3.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);

        cy.log('<--- STEP 22 --->');
        OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.DONOR);
        OrderLines.selectFilterVendorPOL({ vendorName: organizationVendor.name });
        waitForOrderLinesResultsLoading();
        OrderLines.assertOrderLinesResults([
          [{ column: POL_NUMBER_COLUMN, content: orderLine5.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine4.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine3.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_2.poLineNumber }],
          [{ column: POL_NUMBER_COLUMN, content: orderLine1_1.poLineNumber }],
        ]);
      },
    );
  });
});

function getPreconditionSteps() {
  /* Support functions */

  const createOrder = (flow, orderKey) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: flow.get(R.ORG_VENDOR).id }),
    ).then((entity) => flow.set(orderKey, entity, () => Orders.deleteOrderViaApi(entity.id, false)));
  };

  const createOrderLine = (flow, params) => {
    const { orderKey, orderLineKey, fundDistribution, fundKeys, donorOrganizationIds } = params;

    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.defaultOrderLine,
      titleOrPackage: `${BasicOrderLine.defaultOrderLine.titleOrPackage}_${getRandomLetters(5)}`,
      id: uuid(),
      purchaseOrderId: flow.get(orderKey).id,
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      donorOrganizationIds,
      fundDistribution:
        fundDistribution ||
        fundKeys.map((fundKey) => ({
          fundId: flow.get(fundKey).id,
          code: flow.get(fundKey).code,
          value: 100 / fundKeys.length,
        })),
      locations: [{ locationId: flow.get(R.LOCATION).id, quantity: 1, quantityPhysical: 1 }],
      cost: {
        listUnitPrice: 100,
        currency: flow.get(R.LOCALE).currency,
        quantityPhysical: 1,
        poLineEstimatedPrice: 100,
      },
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORG_VENDOR).id,
        volumes: [],
      },
    }).then((entity) => flow.set(orderLineKey, entity, () => OrderLines.deleteOrderLineViaApi(entity.id, false)));
  };

  /* STEPS */

  const fetchLocaleSettings = (flow) => {
    return cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));
  };

  const enableCentralOrdering = () => {
    ConsortiumManagerSettings.enableCentralOrderingViaApi();
  };

  const setTenant = (tenant) => (flow) => {
    const tokenCommandMapping = {
      [Affiliations.Consortia]: 'getAdminToken',
      [Affiliations.College]: 'getCollegeAdminToken',
    };

    cy.setTenant(tenant);
    cy[tokenCommandMapping[tenant]]();
    cy.getAdminUserDetails({ force: true }).then((userDetails) => flow.set(R.ACTIVE_ADMIN, userDetails));
  };

  const createAcquisitionUnit = (flow) => {
    const cleanup = (acqUnitId, membershipId) => {
      AcquisitionUnits.unAssignUserViaApi(membershipId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(acqUnitId, false);
    };

    AcquisitionUnits.createAcquisitionUnitViaApi(
      AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    )
      .then((entity) => flow.set(R.ACQUISITION_UNIT, entity))
      .then(() => {
        const acqUnitId = flow.get(R.ACQUISITION_UNIT).id;

        AcquisitionUnits.assignUserViaApi(flow.get(R.ACTIVE_ADMIN).id, acqUnitId).then(
          (membershipId) => flow.toCleanup(R.ACQUISITION_UNIT, cleanup.bind(null, acqUnitId, membershipId)),
        );
      });
  };

  const createFiscalYear = (flow) => {
    const series = getRandomLetters(5);
    const fiscalYear = {
      ...FiscalYears.getDefaultFiscalYear(),
      series,
    };

    return FiscalYears.createViaApi(fiscalYear).then((entity) => flow.set(R.FISCAL_YEAR, entity, () => FiscalYears.deleteFiscalYearViaApi(entity.id, false)));
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
        name: `${defaultFund.name} - ${nameSuffix}`,
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
    return OrderLinesLimit.getPOLLimit().then((settings) => {
      const initialValue = settings?.[0]?.value || 1;

      OrderLinesLimit.setPOLLimitViaApi(LINES_LIMIT);
      flow.toCleanup(R.LINES_LIMIT, () => OrderLinesLimit.setPOLLimitViaApi(initialValue));
    });
  };

  const createDonorOrganizations = (flow) => {
    const cleanup = (orgId) => Organizations.deleteOrganizationViaApi(orgId);

    [R.ORG_DONOR_A, R.ORG_DONOR_B].forEach((orgKey) => {
      const orgBase = NewOrganization.getDefaultOrganization({ isDonor: true });
      const donorOrg = {
        ...orgBase,
        name: `${orgKey}_donor_${orgBase.name}`,
      };

      Organizations.createOrganizationViaApi(donorOrg).then((organizationId) => flow.set(orgKey, { ...donorOrg, id: organizationId }, cleanup.bind(null, organizationId)));
    });
  };

  const createVendorOrganization = (flow) => {
    const vendorOrg = NewOrganization.getDefaultOrganization({ isDonor: false, isVendor: true });

    return Organizations.createOrganizationViaApi(vendorOrg).then((organizationId) => flow.set(R.ORG_VENDOR, { ...vendorOrg, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
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
      .getAcquisitionMethodsApi()
      .then(({ body }) => flow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
  };

  const createOrder1WithTwoLines = (flow) => {
    // Order #1 with 2 lines: Fund A + Donor A, Fund B + Donor B
    return createOrder(flow, R.ORDER_1)
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_1,
        orderLineKey: R.ORDER_LINE_1_1,
        fundKeys: [R.FUND_A],
        donorOrganizationIds: [flow.get(R.ORG_DONOR_A).id],
      }))
      .then(() => createOrderLine(flow, {
        orderKey: R.ORDER_1,
        orderLineKey: R.ORDER_LINE_1_2,
        fundKeys: [R.FUND_B],
        donorOrganizationIds: [flow.get(R.ORG_DONOR_B).id],
      }));
  };

  const createOrder2WithOneLine = (flow) => {
    // Order #2 with 1 line: Fund A + Donor A
    return createOrder(flow, R.ORDER_2).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_2,
      orderLineKey: R.ORDER_LINE_2,
      fundKeys: [R.FUND_A],
      donorOrganizationIds: [flow.get(R.ORG_DONOR_A).id],
    }));
  };

  const createOrder3WithOneLine = (flow) => {
    // Order #3 with 1 line: Fund B + Donor B
    return createOrder(flow, R.ORDER_3).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_3,
      orderLineKey: R.ORDER_LINE_3,
      fundKeys: [R.FUND_B],
      donorOrganizationIds: [flow.get(R.ORG_DONOR_B).id],
    }));
  };

  const createOrder4WithOneLine = (flow) => {
    // Order #4 with 1 line: Fund A + Fund B + Donor A + Donor B
    return createOrder(flow, R.ORDER_4).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_4,
      orderLineKey: R.ORDER_LINE_4,
      fundKeys: [R.FUND_A, R.FUND_B],
      donorOrganizationIds: [flow.get(R.ORG_DONOR_A).id, flow.get(R.ORG_DONOR_B).id],
    }));
  };

  const createOrder5WithOneLine = (flow) => {
    // Order #5 with 1 line: NO assigned funds, NO assigned donors
    return createOrder(flow, R.ORDER_5).then(() => createOrderLine(flow, {
      orderKey: R.ORDER_5,
      orderLineKey: R.ORDER_LINE_5,
      fundDistribution: [],
      donorOrganizationIds: [],
    }));
  };

  const createAuthorizedUserInMember = (flow) => {
    return cy
      .createTempUser([permissions.uiOrdersView.gui])
      .then((user) => flow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
  };

  const updateUserCentralTenantPermissions = (flow) => {
    cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
      permissions.settingsConsortiaCanViewNetworkOrdering.gui,
    ]);
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.USER);

    interceptQueries();

    cy.clearLocalStorage();
    cy.wait(DEFAULT_WAIT_TIME);

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
    createDonorOrganizations,
    createVendorOrganization,
    enableCentralOrdering,
    fetchLocaleSettings,
    fetchLocation,
    fetchMaterialType,
    fetchAcquisitionMethod,
    createOrder1WithTwoLines,
    createOrder2WithOneLine,
    createOrder3WithOneLine,
    createOrder4WithOneLine,
    createOrder5WithOneLine,
    createAuthorizedUserInMember,
    loginAsAuthorizedUser,
    setTenant,
    updateUserCentralTenantPermissions,
  };
}
