import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
} from '../../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const code = CodeTools(4);
    const fundsCount = 11;
    const polTotalAmount = 1;
    const resultFileName = `${DateTools.getCurrentDateForFileNaming()}-result.csv`;
    const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

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
      funds: [],
      acquisitionMethodId: null,
      orders: [],
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
        testData.funds.push(fundResponse.fund);

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: fundResponse.fund.id,
          allocated: polTotalAmount,
        });
      });
    };

    const createFundsWithBudgets = () => {
      [...Array(fundsCount).keys()].forEach(() => createFundWithBudget());
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

    const createOpenOrderWithLine = (fund) => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      }).then((order) => {
        testData.orders.push(order);

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: order.id,
            title: `AT_C380629_OrderLine_${getRandomPostfix()}`,
            listUnitPrice: polTotalAmount,
            poLineEstimatedPrice: polTotalAmount,
            fundDistribution: [
              {
                code: fund.code,
                fundId: fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        ).then(() => {
          return Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    };

    // Each fund is used for one PO line just once, without duplication
    const createOpenOrders = () => {
      testData.funds.forEach((fund) => createOpenOrderWithLine(fund));
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(createFundsWithBudgets)
        .then(createOrganization)
        .then(getAcquisitionMethodId)
        .then(createOpenOrders)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${resultFileName}`);
      });
    });

    it(
      'C380629 Rollover log does not have records limit and displays all budget records (more than 10) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C380629', 'nonParallel'] },
      () => {
        const rolloverFields = {
          fiscalYear: testData.fiscalYears.second.code,
          rolloverBudgets: [
            {
              checked: true,
              rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
              rolloverValue: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
          rolloverEncumbrance: {
            oneTime: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
            },
          },
        };
        const expectedFundRecords = testData.funds.map((fund) => ({ name: fund.name }));

        // Step 1: Open ledger details pane
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);

        // Steps 2-3: Open rollover form and fill in rollover settings
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 4-6: Run test rollover
        LedgerRolloverDetails.clickTestRolloverButton();

        // Step 7: Check rollover logs
        Ledgers.rolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
          ],
        });

        // Step 8: Export test rollover result
        LedgerRollovers.exportRolloverResult();

        // Step 9: Check that "<mm_dd_yyyy>-result.csv" file contains records for all budgets
        Ledgers.checkRolloverResultCsvContent({
          fileName: resultFileName,
          funds: expectedFundRecords,
        });
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${resultFileName}`);

        // Steps 10-12: Go back to ledger and fill in the same rollover settings
        Ledgers.closeOpenedPage();
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 13-16: Execute rollover
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Step 17: Check rollover logs
        Ledgers.rolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.COMMIT],
            },
          ],
        });

        // Step 18: Export rollover result
        LedgerRollovers.exportRolloverResult();

        // Step 19: Check that "<mm_dd_yyyy>-result.csv" file contains records for all budgets
        Ledgers.checkRolloverResultCsvContent({
          fileName: resultFileName,
          funds: expectedFundRecords,
        });
      },
    );
  });
});
