import Permissions from '../../../../support/dictionary/permissions';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance: Ledgers', () => {
  const testData = {
    user: {},
    fiscalYear: { ...FiscalYears.defaultRolloverFiscalYear },
    ledger: { ...Ledgers.defaultUiLedger },
    fund: { ...Funds.defaultUiFund },
  };

  before('Set up test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear.id = fiscalYearResponse.id;
      testData.ledger.fiscalYearOneId = testData.fiscalYear.id;

      Ledgers.createViaApi(testData.ledger).then((ledgerResponse) => {
        testData.ledger.id = ledgerResponse.id;
        testData.fund.ledgerId = testData.ledger.id;

        Funds.createViaApi(testData.fund).then((fundResponse) => {
          testData.fund.id = fundResponse.fund.id;
        });
      });
      testData.fileName = `Export-${testData.ledger.code}-${testData.fiscalYear.code}`;
    });

    cy.createTempUser([
      Permissions.uiFinanceExportFinanceRecords.gui,
      Permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after('Clean up test data', () => {
    FileManager.deleteFile(`cypress/downloads/${testData.fileName}.csv`);
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C353215 Ledger export settings: current year Fund with NO budget, NO Classes, Export settings; Expense class - NONE (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353215'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(testData.fiscalYear.code, 'None', testData.ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileForNone(`${testData.fileName}.csv`);
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithoutBudgets(
        `${testData.fileName}.csv`,
        1,
        testData.fund,
      );
    },
  );
});
