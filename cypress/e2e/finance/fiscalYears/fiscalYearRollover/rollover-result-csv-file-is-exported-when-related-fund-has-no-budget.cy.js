import {
  EXPORT_BUDGET_FIELDS,
  EXPORT_EXPENSE_CLASS_FIELDS,
  EXPORT_FUND_FIELDS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
} from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import {
  FinanceHelper,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';
import getRandomStringCode from '../../../../support/utils/generateTextCode';

const R = {
  INITIAL_FISCAL_YEAR: 'initialFiscalYear',
  NEXT_FISCAL_YEAR: 'nextFiscalYear',
  LEDGER: 'ledger',
  FUND: 'fund',
  USER_PROPERTIES: 'userProperties',
};

const CSV_HEADERS_SET = new Set(
  Object.values({
    ...EXPORT_FUND_FIELDS,
    ...EXPORT_BUDGET_FIELDS,
    ...EXPORT_EXPENSE_CLASS_FIELDS,
  }).map((header) => `"${header}"`),
);

const deleteDownloadedFile = (fileName) => {
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${fileName}`);
};

const checkDownloadedHeaderOnlyCsv = (fileName) => {
  FileManager.readFile(`${Cypress.config('downloadsFolder')}/${fileName}`).then((fileContent) => {
    const rows = fileContent
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    expect(rows).to.have.length(1);
    // Verify that the header contains only expected columns, ignoring the order
    expect(new Set(rows[0].split(',')).difference(CSV_HEADERS_SET).size).to.equal(0);
  });
};

describe('Finance | Fiscal Year Rollover', () => {
  const flow = new ExecutionFlowManager();

  before('Create rollover data with fund without budget', () => {
    cy.getAdminToken();

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createActiveConsecutiveFiscalYears) // Precondition #1
      .step(steps.createActiveLedgerForInitialFiscalYear) // Precondition #2
      .step(steps.createActiveFundWithoutBudget) // Precondition #3
      .step(steps.performTestAndCommonRollovers) // Precondition #4
      .step(steps.createTestUser) // Precondition #5
      .step(steps.loginToLedgerPane); // Precondition #6
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C770425 Rollover result.csv file is exported when related fund has no budget (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C770425'] },
    () => {
      const { ledger } = flow.ctx();

      const fileNameDate = DateTools.getCurrentDateForFileNaming();
      const resultFileName = `${fileNameDate}-result.csv`;
      const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

      /* STEP 1 */
      FinanceHelper.searchByName(ledger.name);
      FinanceHelper.clickLedgerRecordLink(ledger.name);
      LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();
      LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
      LedgerDetails.verifyLedgerName(ledger.name);

      /* STEP 2 */
      Ledgers.rolloverLogs();
      LedgerRollovers.checkTableContent({
        records: [
          {
            status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
            results: resultsColumnValue,
            source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.COMMIT],
          },
          {
            status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
            results: resultsColumnValue,
            source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
          },
        ],
      });

      /* STEP 3 */
      LedgerRollovers.exportRolloverResult({ row: 1 }); // Rollover preview result

      /* STEP 4 */
      checkDownloadedHeaderOnlyCsv(resultFileName);
      deleteDownloadedFile(resultFileName); // Clean up before next export to avoid confusion with multiple files

      /* STEP 5 */
      LedgerRollovers.exportRolloverResult({ row: 0 }); // Rollover commit result

      /* STEP 6 */
      checkDownloadedHeaderOnlyCsv(resultFileName);
      deleteDownloadedFile(resultFileName); // Clean up after test
    },
  );
});

function getPreconditionSteps() {
  const registerFiscalYear = (flow, key, fiscalYear) => flow.set(key, fiscalYear, (entity) => FiscalYears.deleteFiscalYearViaApi(entity.id, false));

  const registerLedger = (flow, ledger) => flow.set(R.LEDGER, ledger, (entity) => Ledgers.deleteLedgerViaApi(entity.id, false));

  const registerFund = (flow, fundData) => flow.set(R.FUND, fundData, (entity) => Funds.deleteFundViaApi(entity.fund.id, false));

  const registerRollover = (flow, prefix, ledgerRollover) => flow.set(`${prefix}-${ledgerRollover.id}`, ledgerRollover, (entity) => LedgerRollovers.deleteLedgerRolloverViaApi(entity.id));

  const registerUser = (flow, userProperties) => flow.set(R.USER_PROPERTIES, userProperties, (entity) => Users.deleteViaApi(entity.userId));

  const createActiveConsecutiveFiscalYears = (flow) => {
    const defaultRolloverFiscalYear = FiscalYears.defaultRolloverFiscalYear;
    const series = getRandomStringCode(4);

    [R.INITIAL_FISCAL_YEAR, R.NEXT_FISCAL_YEAR].forEach((key, index) => {
      const periods = DateTools.getFullFiscalYearStartAndEnd(index);

      FiscalYears.createViaApi({
        ...defaultRolloverFiscalYear,
        ...periods,
        series,
        code: `${series}${new Date(periods.periodStart).getFullYear()}`,
      }).then((fiscalYear) => registerFiscalYear(flow, key, fiscalYear));
    });
  };

  const createActiveLedgerForInitialFiscalYear = (flow) => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: flow.get(R.INITIAL_FISCAL_YEAR).id,
    }).then((ledger) => registerLedger(flow, ledger));
  };

  const createActiveFundWithoutBudget = (flow) => {
    const { name, ...baseFund } = Funds.getDefaultFund();

    return Funds.createViaApi({
      ...baseFund,
      name: `[no-budget]_${name}`,
      ledgerId: flow.get(R.LEDGER).id,
    }).then((fundData) => registerFund(flow, fundData));
  };

  const performTestAndCommonRollovers = (flow) => {
    const buildRollover = () => LedgerRollovers.generateLedgerRollover({
      ledger: flow.get(R.LEDGER),
      fromFiscalYear: flow.get(R.INITIAL_FISCAL_YEAR),
      toFiscalYear: flow.get(R.NEXT_FISCAL_YEAR),
      encumbrancesRollover: [],
    });

    [LEDGER_ROLLOVER_TYPES.PREVIEW, LEDGER_ROLLOVER_TYPES.COMMIT].forEach((type) => {
      LedgerRollovers.createLedgerRolloverViaApi({
        ...buildRollover(),
        rolloverType: type,
      }).then((rollover) => registerRollover(flow, type, rollover));
    });
  };

  const createTestUser = (flow) => {
    return cy
      .createTempUser([
        permissions.uiFinanceViewFiscalYear.gui,
        permissions.uiFinanceViewLedger.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiFinanceExecuteFiscalYearRollover.gui,
      ])
      .then((userProperties) => registerUser(flow, userProperties));
  };

  const loginToLedgerPane = (flow) => {
    const userProperties = flow.get(R.USER_PROPERTIES);

    cy.login(userProperties.username, userProperties.password, {
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });
  };

  return {
    createActiveConsecutiveFiscalYears,
    createActiveLedgerForInitialFiscalYear,
    createActiveFundWithoutBudget,
    performTestAndCommonRollovers,
    createTestUser,
    loginToLedgerPane,
  };
}
