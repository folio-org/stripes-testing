import { INVOICE_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Invoices from '../../support/fragments/invoices/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';

const R = {
  USER: 'user',
  ORG: 'org',
  INVOICE_1: 'invoice1',
  INVOICE_2: 'invoice2',
};

describe('Invoices', () => {
  describe('Edge Cases', () => {
    const flow = new ExecutionFlowManager();

    before('Create C451605 preconditions', () => {
      cy.getAdminToken();
      flow
        .step((currentFlow) => {
          // Precondition 1: Organization exists to associate with invoices
          const organization = NewOrganization.getDefaultOrganization();

          return Organizations.createOrganizationViaApi(organization, { returnBody: true }).then(
            (org) => {
              return currentFlow.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id));
            },
          );
        })
        .step((currentFlow) => {
          // Precondition 1: At least 2 invoices in Open status exist; note their numbers
          return Invoices.createInvoiceViaApi({
            vendorId: currentFlow.get(R.ORG).id,
            invoiceStatus: INVOICE_STATUSES.OPEN,
          }).then((invoice1) => {
            return currentFlow.set(R.INVOICE_1, invoice1, () => Invoices.deleteInvoiceViaApi(invoice1.id));
          });
        })
        .step((currentFlow) => {
          // Precondition 1: Second invoice in Open status
          return Invoices.createInvoiceViaApi({
            vendorId: currentFlow.get(R.ORG).id,
            invoiceStatus: INVOICE_STATUSES.OPEN,
          }).then((invoice2) => {
            return currentFlow.set(R.INVOICE_2, invoice2, () => Invoices.deleteInvoiceViaApi(invoice2.id));
          });
        })
        .step((currentFlow) => {
          // Precondition 2: User with "Invoice: Can view Invoices and Invoice lines" permission
          return cy
            .createTempUser([Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui])
            .then((userProperties) => {
              return currentFlow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
            });
        })
        .step((currentFlow) => {
          // Precondition 3: User is on "Invoices" app
          return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
    });

    after('Delete C451605 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C451605 Correct page title when Invoice details pane is opened (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C451605'] },
      () => {
        cy.log('<--- STEP 1 --->');
        cy.title().should('eq', 'Invoices - FOLIO');

        cy.log('<--- STEP 2 --->');
        cy.then(() => {
          const invoice1Number = flow.get(R.INVOICE_1).vendorInvoiceNo;
          Invoices.searchByNumber(invoice1Number);
          Invoices.waitLoading();
          cy.title().should('eq', `Invoices - ${invoice1Number} - Search - FOLIO`);
        });

        cy.log('<--- STEP 3 --->');
        cy.then(() => {
          const invoice1Number = flow.get(R.INVOICE_1).vendorInvoiceNo;
          Invoices.selectInvoice(invoice1Number);
          cy.title().should('eq', `Invoices - ${invoice1Number} - FOLIO`);
        });

        cy.log('<--- STEP 4 --->');
        cy.then(() => {
          const invoice1Number = flow.get(R.INVOICE_1).vendorInvoiceNo;
          Invoices.closeInvoiceDetailsPane();
          cy.title().should('eq', `Invoices - ${invoice1Number} - Search - FOLIO`);
        });

        cy.log('<--- STEP 5 --->');
        Invoices.resetFilters();
        cy.title().should('eq', 'Invoices - FOLIO');

        cy.log('<--- STEP 6 --->');
        Invoices.selectStatusFilter(INVOICE_STATUSES.OPEN);
        Invoices.waitLoading();

        cy.log('<--- STEP 7 --->');
        cy.then(() => {
          const invoice1Number = flow.get(R.INVOICE_1).vendorInvoiceNo;
          Invoices.selectInvoice(invoice1Number);
          cy.title().should('eq', `Invoices - ${invoice1Number} - FOLIO`);
        });

        cy.log('<--- STEP 8 --->');
        cy.then(() => {
          const invoice2Number = flow.get(R.INVOICE_2).vendorInvoiceNo;
          Invoices.selectInvoice(invoice2Number);
          cy.title().should('eq', `Invoices - ${invoice2Number} - FOLIO`);
        });

        cy.log('<--- STEP 9 --->');
        cy.then(() => {
          const invoice2Number = flow.get(R.INVOICE_2).vendorInvoiceNo;
          cy.title().should('eq', `Invoices - ${invoice2Number} - FOLIO`);
        });
      },
    );
  });
});
