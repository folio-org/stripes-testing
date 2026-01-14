import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Users from '../../../support/fragments/users/users';

describe('Finance › Ledgers', () => {
  let user;
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  let fileName;

  before('Create user, fiscal year, ledger, and fund', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearId) => {
      defaultFiscalYear.id = fiscalYearId.id;
      defaultLedger.fiscalYearOneId = fiscalYearId.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerId) => {
        defaultLedger.id = ledgerId.id;
        defaultFund.ledgerId = ledgerId.id;
        Funds.createViaApi(defaultFund).then((fundId) => {
          defaultFund.id = fundId.fund.id;
        });
      });
    });

    fileName = `Export-${defaultLedger.code}-${defaultFiscalYear.code}`;
    cy.createTempUser([
      permissions.uiFinanceExportFinanceRecords.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C356408 All common column headings include a record name in budget export .csv file (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C356408'] },
    () => {
      Ledgers.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(defaultFiscalYear.code, 'All', defaultLedger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(`${fileName}.csv`);
      Ledgers.deleteDownloadedFile(`${fileName}.csv`);
    },
  );
});
