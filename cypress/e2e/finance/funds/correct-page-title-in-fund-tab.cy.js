import Permissions from '../../../support/dictionary/permissions';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';

describe('Finance', () => {
  describe('Funds', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      FISCAL_YEAR: 'fiscalYear',
      LEDGER: 'ledger',
      FUND_1: 'fund1',
      FUND_2: 'fund2',
      USER: 'user',
    };

    before(() => {
      cy.getAdminToken();
      flow
        .step((f) => {
          cy.log('Precondition 1: Resolve a fiscal year to assign to the ledger');
          return cy
            .getFiscalYearsApi({ limit: 1 })
            .then(({ body }) => f.set(R.FISCAL_YEAR, body.fiscalYears[0]));
        })
        .step((f) => {
          cy.log('Precondition 1: Create a ledger to associate funds with');
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FISCAL_YEAR).id,
          }).then((ledger) => f.set(R.LEDGER, ledger, (l) => Ledgers.deleteLedgerViaApi(l.id, false)));
        })
        .step((f) => {
          cy.log('Precondition 1: Create Fund #1 with Active status');
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
          }).then((response) => f.set(R.FUND_1, response.fund, (fund) => Funds.deleteFundViaApi(fund.id, false)));
        })
        .step((f) => {
          cy.log('Precondition 1: Create Fund #2 with Active status');
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
          }).then((response) => f.set(R.FUND_2, response.fund, (fund) => Funds.deleteFundViaApi(fund.id, false)));
        })
        .step((f) => {
          cy.log('Precondition 2: User with Finance: View fund and budget permission');
          return cy
            .createTempUser([Permissions.uiFinanceViewFundAndBudget.gui])
            .then((user) => f.set(R.USER, user, (u) => Users.deleteViaApi(u.userId)));
        })
        .step((f) => {
          cy.log('Precondition 3: Log in and navigate to Finance > Fund');
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C451611 Correct page title when Fund details pane is opened ("Finance" app) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C451611'] },
      () => {
        const { fund1, fund2 } = flow.ctx();

        cy.log('Step 1. Check the name of browser tab');
        cy.title().should('eq', 'Finance - FOLIO');

        cy.log('Step 2. Search for Fund #1 by name');
        Funds.searchByName(fund1.name);
        Funds.verifyFundLinkNameExists(fund1.name);
        cy.title().should('eq', `Finance - ${fund1.name} - Search - FOLIO`);

        cy.log('Step 3. Click on Fund #1');
        Funds.selectFund(fund1.name);
        cy.title().should('eq', `Finance - ${fund1.name} - FOLIO`);

        cy.log('Step 4. Close the third pane with Fund details');
        FundDetails.closeFundDetails();
        cy.title().should('eq', `Finance - ${fund1.name} - Search - FOLIO`);

        cy.log('Step 5. Click "Reset all" button on "Search & filter" pane');
        Funds.resetFundFilters();
        cy.title().should('eq', 'Finance - FOLIO');

        cy.log('Step 6. Check the Active status checkbox on the "Status" facet');
        Funds.selectStatusInSearch(FinanceHelper.statusActive);
        Funds.verifyFundLinkNameExists(fund1.name);
        Funds.verifyFundLinkNameExists(fund2.name);

        cy.log('Step 7. Click on Fund #1');
        Funds.selectFund(fund1.name);
        cy.title().should('eq', `Finance - ${fund1.name} - FOLIO`);

        cy.log('Step 8. Click on Fund #2 in the results list');
        Funds.selectFund(fund2.name);
        cy.title().should('eq', `Finance - ${fund2.name} - FOLIO`);

        cy.log('Step 9. Check the name of browser tab (bookmark title)');
        cy.title().should('eq', `Finance - ${fund2.name} - FOLIO`);
      },
    );
  });
});
