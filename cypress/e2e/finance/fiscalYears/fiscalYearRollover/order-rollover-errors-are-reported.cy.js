import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS,
  ORDER_STATUSES,
} from '../../../../support/constants';
import {
  Budgets,
  FiscalYears,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  Ledgers,
} from '../../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../../../support/utils';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const code = CodeTools(4);

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      fund: {},
      budget: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createFinanceData = () => {
      const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: testData.fiscalYears.first,
        budget: { allocated: 1000 },
      });

      testData.fiscalYears.first = financeData.fiscalYear;
      testData.ledger = financeData.ledger;
      testData.fund = financeData.fund;
      testData.budget = financeData.budget;
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
        });
    };

    const createOngoingOrderWithLine = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: false, manualRenewal: false },
        }),
        reEncumber: true,
      })
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: testData.order.id,
              title: `AT_C357575_OrderLine_${getRandomPostfix()}`,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 100,
              poLineEstimatedPrice: 100,
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
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiFinanceViewEditCreateFiscalYear.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
          Ledgers.searchByName(testData.ledger.name);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createFiscalYear('second')
        .then(createFinanceData)
        .then(createOrganization)
        .then(getAcquisitionMethodId)
        .then(createOngoingOrderWithLine)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C357575 Order rollover errors are reported (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C357575'] },
      () => {
        // Step 1: Open ledger details pane
        Ledgers.selectLedger(testData.ledger.name);

        // Step 2: Open rollover form
        LedgerDetails.openLedgerRolloverEditForm();

        // Step 3: Fill in rollover settings
        LedgerRolloverDetails.fillLedgerRolloverFields({
          rolloverBudgets: [{ adjustAllocation: '50' }],
          fiscalYear: testData.fiscalYears.second.code,
          rolloverEncumbrance: {
            ongoing: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
            },
          },
        });

        // Steps 4-6: Execute rollover and check that errors are reported
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails({ successful: false });
        LedgerRolloverInProgress.checkRolloverErrorLink({
          ledgerName: testData.ledger.name,
          fiscalYearCode: testData.fiscalYears.second.code,
        });
      },
    );
  });
});
