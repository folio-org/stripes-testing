import Permissions from '../../../support/dictionary/permissions';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';

describe('Finance', () => {
  describe('Ledgers', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      FISCAL_YEAR: 'fiscalYear',
      LEDGER_1: 'ledger1',
      LEDGER_2: 'ledger2',
      USER: 'user',
    };

    before(() => {
      cy.getAdminToken();

      flow
        .step((f) => {
          cy.log('Precondition 1: Resolve a fiscal year to assign to both ledgers');
          return cy
            .getFiscalYearsApi({ limit: 1 })
            .then(({ body }) => f.set(R.FISCAL_YEAR, body.fiscalYears[0]));
        })
        .step((f) => {
          cy.log('Precondition 1: Create Ledger #1 with Active status');
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FISCAL_YEAR).id,
          }).then((ledger) => f.set(R.LEDGER_1, ledger, (l) => Ledgers.deleteLedgerViaApi(l.id, false)));
        })
        .step((f) => {
          cy.log('Precondition 1: Create Ledger #2 with Active status');
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FISCAL_YEAR).id,
          }).then((ledger) => f.set(R.LEDGER_2, ledger, (l) => Ledgers.deleteLedgerViaApi(l.id, false)));
        })
        .step((f) => {
          cy.log('Precondition 2: User with Finance: View ledger permission');
          return cy
            .createTempUser([Permissions.uiFinanceViewLedger.gui])
            .then((user) => f.set(R.USER, user, (u) => Users.deleteViaApi(u.userId)));
        })
        .step((f) => {
          cy.log('Precondition 3: Log in and navigate to Finance > Ledger');
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C451609 Correct page title in Ledger tab ("Finance" app) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C451609'] },
      () => {
        const { ledger1, ledger2 } = flow.ctx();

        cy.log('Step 1. Check the name of browser tab');
        cy.title().should('eq', 'Finance - FOLIO');

        cy.log('Step 2. Enter Ledger #1 name into search box — do NOT click Search');
        Ledgers.fillSearchInput(ledger1.name);
        cy.title().should('eq', 'Finance - FOLIO');

        cy.log('Step 3. Click "Search" button');
        Ledgers.clickSearchButton();
        Ledgers.verifyLedgerLinkExists(ledger1.name);
        cy.title().should('eq', `Finance - ${ledger1.name} - Search - FOLIO`);

        cy.log('Step 4. Click on Ledger #1');
        Ledgers.selectLedger(ledger1.name);
        cy.title().should('eq', `Finance - ${ledger1.name} - FOLIO`);

        cy.log('Step 5. Close the third pane with Ledger details');
        LedgerDetails.closeLedgerDetails();
        cy.title().should('eq', `Finance - ${ledger1.name} - Search - FOLIO`);

        cy.log('Step 6. Click "Reset all" button on "Search & filter" pane');
        Ledgers.resetAll();
        cy.title().should('eq', 'Finance - FOLIO');

        cy.log('Step 7. Check the Active status checkbox on the "Status" facet');
        Ledgers.selectStatusInSearch(FinanceHelper.statusActive);
        Ledgers.verifyLedgerLinkExists(ledger1.name);
        Ledgers.verifyLedgerLinkExists(ledger2.name);

        cy.log('Step 8. Click on Ledger #1');
        Ledgers.selectLedger(ledger1.name);
        cy.title().should('eq', `Finance - ${ledger1.name} - FOLIO`);

        cy.log('Step 9. Click on Ledger #2');
        Ledgers.selectLedger(ledger2.name);
        cy.title().should('eq', `Finance - ${ledger2.name} - FOLIO`);

        cy.log('Step 11. Click "x" icon next to the "Status" facet to clear the filter');
        LedgerDetails.closeLedgerDetails();
        Ledgers.clearStatusFilter();
        cy.title().should('eq', 'Finance - FOLIO');
      },
    );
  });
});
