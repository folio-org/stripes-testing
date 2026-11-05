import { INVOICE_FILTERS_LABELS } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { CREATED_BY_INVOICE_LINE } = INVOICE_FILTERS_LABELS;
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C466120_Organization_${getRandomPostfix()}`,
    };
    testData.invoices = {};
    testData.users = {};

    const createInvoice = (key) => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        batchGroupId: testData.batchGroupId,
      }).then((invoice) => {
        testData.invoices[key] = invoice;
      });
    };
    const addInvoiceLine = (invoice) => {
      Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: invoice.id,
          invoiceLineStatus: invoice.status,
        }),
      );
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    cy.getBatchGroups().then(({ id }) => {
      testData.batchGroupId = id;

      // Invoice #1 in "Open" status without invoice lines
      createInvoice('first');
    });

    ['first', 'second'].forEach((key) => {
      cy.createTempUser([]).then((userProperties) => {
        testData.users[key] = userProperties;

        cy.assignCapabilitiesToExistingUser(
          userProperties.userId,
          [],
          [CapabilitySets.uiInvoiceInvoiceCreate],
        );
      });
    });

    cy.then(() => {
      // User #1 adds Invoice line #1 to Invoice #1
      cy.getUserToken(testData.users.first.username, testData.users.first.password);
      addInvoiceLine(testData.invoices.first);

      // User #2 adds Invoice line #2 to Invoice #1 and creates Invoice #2 without invoice lines
      cy.getUserToken(testData.users.second.username, testData.users.second.password);
      addInvoiceLine(testData.invoices.first);
      createInvoice('second');

      // User #1 creates Invoice #3 with one invoice line
      cy.getUserToken(testData.users.first.username, testData.users.first.password);
      createInvoice('third').then(() => addInvoiceLine(testData.invoices.third));

      cy.login(testData.users.first.username, testData.users.first.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Object.values(testData.users).forEach((user) => Users.deleteViaApi(user.userId));
    Object.values(testData.invoices).forEach((invoice) => Invoices.deleteInvoiceViaApi(invoice.id));
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C466120 Invoice lines can be found by "Created by (Invoice line)" filter (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C466120'] },
    () => {
      const [firstInvoiceNo, secondInvoiceNo, thirdInvoiceNo] = ['first', 'second', 'third'].map(
        (key) => testData.invoices[key].vendorInvoiceNo,
      );

      Invoices.waitForFiltersLoaded();

      // Step 1: Click "Reset all" button on "Search & filter" pane
      Invoices.clearAllFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 2-4: Expand "Created by (Invoice Line)" facet, click "Find user" link, select User #1
      Invoices.filterByUser(CREATED_BY_INVOICE_LINE, testData.users.first.username);
      Invoices.verifyUserFilterSelected(CREATED_BY_INVOICE_LINE, testData.users.first.username);
      Invoices.assertInvoicesInResults([firstInvoiceNo, thirdInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([secondInvoiceNo]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 6-7: Click "Find user" link, select User #2
      Invoices.filterByUser(CREATED_BY_INVOICE_LINE, testData.users.second.username);
      Invoices.verifyUserFilterSelected(CREATED_BY_INVOICE_LINE, testData.users.second.username);
      Invoices.assertInvoicesInResults([firstInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([secondInvoiceNo, thirdInvoiceNo]);

      // Step 8: Click "x" icon next to "Created by (Invoice Line)" filter
      Invoices.clearFilter(CREATED_BY_INVOICE_LINE);
      Invoices.assertFilterClearButton(CREATED_BY_INVOICE_LINE, false);
      Invoices.verifyChooseFilterMessage();
    },
  );
});
