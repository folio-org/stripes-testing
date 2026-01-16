import { Permissions } from '../../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Groups,
  Ledgers,
  LedgerRollovers,
  FinanceHelper,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../support/utils';

describe('Finance', () => {
  describe('Transactions', () => {
    const date = new Date();
    const code = CodeTools(4);
    const group = Groups.getDefaultGroup();
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
    const ledgers = {
      first: {
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledger_00A.${new Date().getTime()}`,
        fiscalYearOneId: fiscalYears.current.id,
      },
      second: {
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledger_00B.${new Date().getTime()}`,
        fiscalYearOneId: fiscalYears.current.id,
      },
    };
    const funds = {
      first: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00A.${new Date().getTime()}`,
        ledgerId: ledgers.first.id,
      },
      second: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_00B.${new Date().getTime()}`,
        ledgerId: ledgers.second.id,
      },
    };
    const budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.second.id,
      },
    };
    const testData = {
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          Groups.createViaApi(group);
          Object.values(fiscalYears).forEach((fiscalYear) => {
            FiscalYears.createViaApi(fiscalYear);
          });
          Object.values(ledgers).forEach((ledger) => {
            Ledgers.createViaApi(ledger);
          });
          Object.values(funds).forEach((fund) => {
            Funds.createViaApi(fund, [group.id]);
          });
          Object.values(budgets).forEach((budget) => {
            Budgets.createViaApi(budget);
          });
        })
        .then(() => {
          Object.values(ledgers).forEach((ledger) => {
            const rollover = LedgerRollovers.generateLedgerRollover({
              ledger,
              fromFiscalYear: fiscalYears.current,
              toFiscalYear: fiscalYears.next,
              budgetsRollover: [{ addAvailableTo: 'Available', rolloverBudgetValue: 'Available' }],
            });
            LedgerRollovers.createLedgerRolloverViaApi(rollover);
          });

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
        });

      cy.createTempUser([
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceFinanceViewGroup.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(budgets).forEach((budget) => {
          Budgets.deleteViaApi(budget.id, false);
        });
        Object.values(funds).forEach((fund) => {
          Funds.deleteFundViaApi(fund.id, false);
        });
        Object.values(ledgers).forEach((ledger) => {
          Ledgers.deleteLedgerViaApi(ledger.id, false);
        });
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false);
        });
        Groups.deleteGroupViaApi(group.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C375980 Rollover transfer amounts are included in Group and Ledger summary for Net Transfers (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375980'] },
      () => {
        FinanceHelper.searchByName(fiscalYears.next.name);
        const FiscalYearDetails = FiscalYears.selectFisacalYear(fiscalYears.next.name);
        FiscalYearDetails.checkFiscalYearDetails({
          financialSummary: {
            information: [
              { key: 'Initial allocation', value: '$0.00' },
              { key: 'Total allocated', value: '$0.00' },
              { key: 'Total funding', value: '$2,000.00' },
            ],
            balance: { cash: '$2,000.00', available: '$2,000.00' },
          },
          ledgers: [
            {
              name: ledgers.first.name,
              code: ledgers.first.code,
              allocated: '$0.00',
              unavailable: '$0.00',
              available: '$1,000.00',
            },
            {
              name: ledgers.second.name,
              code: ledgers.second.code,
              allocated: '$0.00',
              unavailable: '$0.00',
              available: '$1,000.00',
            },
          ],
          groups: [
            {
              name: group.name,
              code: group.code,
              allocated: '$0.00',
              unavailable: '$0.00',
              available: '$2,000.00',
            },
          ],
          funds: [
            {
              name: funds.first.name,
              code: funds.first.code,
              allocated: '$0.00',
              unavailable: '$0.00',
              available: '$1,000.00',
            },
            {
              name: funds.second.name,
              code: funds.second.code,
              allocated: '$0.00',
              unavailable: '$0.00',
              available: '$1,000.00',
            },
          ],
        });

        // Click "Ledger A" record in "Ledger" accordion
        const LedgerDetails = FiscalYearDetails.openLedgerDetails(ledgers.first.name);
        LedgerDetails.checkLedgerDetails({
          financialSummary: [{ key: 'Net transfers', value: '$1,000.00' }],
        });

        // Click "Group" record in "Group" accordion
        const GroupDetails = LedgerDetails.openGroupDetails(group.name);
        GroupDetails.checkGroupDetails({
          financialSummary: [{ key: 'Net transfers', value: '$2,000.00' }],
        });

        // Click "Ledger" toggle on "Search & filter" pane
        FinanceHelper.switchSearchType({ type: 'Ledger' });

        // Search for "Ledger B" and click on its name link on the second "Ledger" pane
        FinanceHelper.searchByName(ledgers.second.name);
        Ledgers.selectLedger(ledgers.second.name);
        LedgerDetails.checkLedgerDetails({
          financialSummary: [{ key: 'Net transfers', value: '$1,000.00' }],
        });
      },
    );
  });
});
