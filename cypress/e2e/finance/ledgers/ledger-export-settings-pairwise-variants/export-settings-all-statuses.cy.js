import Permissions from '../../../../support/dictionary/permissions';
import {
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import { NewOrganization } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance: Ledgers', () => {
  const date = new Date();
  const code = CodeTools(4);
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const testData = {
    organization,
    user: {},
  };
  const fiscalYears = {
    current: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      periodStart: new Date(date.getFullYear(), 0, 1),
      periodEnd: new Date(date.getFullYear(), 11, 31),
    },
    next: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      periodStart: new Date(date.getFullYear() + 1, 0, 1),
      periodEnd: new Date(date.getFullYear() + 1, 11, 31),
    },
  };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };

  before('Setup test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYears.current).then((fiscalYearResponse) => {
      fiscalYears.current.id = fiscalYearResponse.id;
      ledger.fiscalYearOneId = fiscalYears.current.id;

      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        fund.ledgerId = ledgerResponse.id;
        Funds.createViaApi(fund).then((fundResponse) => {
          fund.id = fundResponse.fund.id;
        });

        // Create second Fiscal Year for Rollover
        FiscalYears.createViaApi(fiscalYears.next);
        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger,
          fromFiscalYear: fiscalYears.current,
          toFiscalYear: fiscalYears.next,
          restrictEncumbrance: true,
          restrictExpenditures: true,
          needCloseBudgets: true,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: 'None',
              addAvailableTo: 'Allocation',
            },
          ],
          encumbrancesRollover: [{ orderType: 'One-time', basedOn: 'InitialAmount' }],
        });
        LedgerRollovers.createLedgerRolloverViaApi(rollover);
        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.current,
          _version: 1,
          periodStart: new Date(date.getFullYear() - 1, 0, 1),
          periodEnd: new Date(date.getFullYear() - 1, 11, 31),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.next,
          _version: 1,
          periodStart: new Date(date.getFullYear(), 0, 1),
          periodEnd: new Date(date.getFullYear(), 11, 31),
        });
        testData.fileName = `Export-${ledger.code}-${fiscalYears.next.code}`;
      });
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

  after('Cleanup test data', () => {
    FileManager.deleteFile(`cypress/downloads/${testData.fileName}.csv`);
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C353212 Ledger export settings: last year Fund with NO budget, NO Classes, Export settings-All statuses (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353212'] },
    () => {
      FinanceHelp.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(fiscalYears.next.code, 'All', ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
      );
      Ledgers.checkColumnContentInDownloadedLedgerExportFileForNone(
        `${testData.fileName}.csv`,
        1,
        fund,
        'No budget found',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      );
    },
  );
});
