import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  Groups,
  Ledgers,
} from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { NumberTools } from '../../support/utils';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Finance', () => {
  const allocatedAmount = 1000;
  // Estimated price exceeds the budget allocation, so the budget runs a deficit
  const orderLinePrice = 1100;

  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    group: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    order: {},
    orderLine: {},
    user: {},
    locale: 'en-US',
  };

  const createGroup = () => {
    return Groups.createViaApi(Groups.getDefaultGroup()).then((group) => {
      testData.group = group;
    });
  };

  const createBudgetWithFundLedgerAndFiscalYear = () => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      ledger: { restrictEncumbrance: false, restrictExpenditures: false },
      budget: { allocated: allocatedAmount },
    });

    testData.fiscalYear = fiscalYear;
    testData.ledger = ledger;
    testData.fund = fund;
    testData.budget = budget;
  };

  const addFundToGroup = () => {
    return Funds.getFundsViaApi({ query: `id=="${testData.fund.id}"` }).then(({ funds }) => {
      return Funds.updateFundViaApi(funds[0], [testData.group.id]);
    });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createOpenOrderWithLine = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;

        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        );
      })
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: orderLinePrice,
            poLineEstimatedPrice: orderLinePrice,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewGroups.gui,
        Permissions.uiFinanceViewLedger.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });

    createGroup()
      .then(createBudgetWithFundLedgerAndFiscalYear)
      .then(addFundToGroup)
      .then(createOrganization)
      .then(createOpenOrderWithLine)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C377030 "Available balance" is displayed as a negative number when running a deficit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C377030'] },
    () => {
      const format = (value) => NumberTools.formatCurrency(value, testData.locale);
      const deficit = format(allocatedAmount - orderLinePrice);
      const balance = { cash: format(allocatedAmount), available: deficit };

      // Step 1: Open "Fiscal year #1" details
      FinanceHelper.searchByName(testData.fiscalYear.name);
      const FiscalYearDetails = FiscalYears.selectFiscalYear(testData.fiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        financialSummary: { balance },
        ledgers: [{ name: testData.ledger.name, available: deficit }],
        groups: [{ name: testData.group.name, available: deficit }],
        funds: [{ name: testData.fund.name, available: deficit }],
      });

      // Steps 2-3: Open Ledger details
      FinanceHelper.selectLedgersNavigation();
      FinanceHelper.searchByName(testData.ledger.name);
      const LedgerDetails = Ledgers.selectLedger(testData.ledger.name);
      LedgerDetails.checkLedgerDetails({ financialSummary: { balance } });

      // Steps 4-5: Open Group details
      FinanceHelper.selectGroupsNavigation();
      Groups.searchByName(testData.group.name);
      const GroupDetails = Groups.selectGroupByName(testData.group.name);
      GroupDetails.checkGroupDetails({ financialSummary: { balance } });

      // Steps 6-7: Open "Fund A" details
      FinanceHelper.selectFundsNavigation();
      FinanceHelper.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      FundDetails.checkFundDetails({
        currentBudget: {
          name: testData.budget.name,
          allocated: format(allocatedAmount),
          available: deficit,
        },
      });
    },
  );
});
