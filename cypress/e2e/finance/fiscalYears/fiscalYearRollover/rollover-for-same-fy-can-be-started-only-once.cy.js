import { Permissions } from '../../../../support/dictionary';
import {
  FinanceHelper,
  FiscalYears,
  Ledgers,
  LedgerRolloverInProgress,
} from '../../../../support/fragments/finance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const date = new Date();
    const code = CodeTools(4);
    const fiscalYears = {
      current: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      },
      upcoming: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}03`,
        periodStart: new Date(date.getFullYear() + 2, 0, 1),
        periodEnd: new Date(date.getFullYear() + 2, 11, 31),
      },
    };
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id };
    const testData = {
      fiscalYears,
      ledger,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });
        Ledgers.createViaApi(ledger);
      });

      cy.createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewEditLedger.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FiscalYears.deleteFiscalYearViaApi(fiscalYears.next.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C360956 Rollover for one ledger and same fiscal year can be started just once (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C360956'] },
      () => {
        // Click on Ledger name link from preconditions
        FinanceHelper.searchByName(ledger.name);
        const LedgerDetails = Ledgers.selectLedger(ledger.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Name', value: ledger.name }],
        });

        // Click "Actions" button, Select "Rollover" option
        const LedgerRolloverDetails = LedgerDetails.openLedgerRolloverEditForm();

        // Select the next fiscal year FY-XXXY (e.g. FY-2024) in "Fiscal year" dropdown
        LedgerRolloverDetails.fillLedgerRolloverFields({ fiscalYear: fiscalYears.upcoming.code });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Name', value: ledger.name }],
        });

        // Click "Actions" button, Select "Rollover" option
        LedgerDetails.openLedgerRolloverEditForm();

        // Select FY-XXXZ fiscal year (e.g. FY-2025) in "Fiscal year" dropdown
        LedgerRolloverDetails.fillLedgerRolloverFields({ fiscalYear: fiscalYears.next.code });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton({ rolloverFailed: true });
      },
    );
  });
});
