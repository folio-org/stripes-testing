import moment from 'moment';
import { INVOICE_FILTERS_LABELS } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InvoiceLineDetails, Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { DATE_UPDATED, UPDATED_BY, UPDATED_BY_INVOICE_LINE } = INVOICE_FILTERS_LABELS;
  const START_DATE_GREATER_THAN_END_DATE_ERROR = 'Start date is greater than end date';
  const DATE_FORMAT = 'MM/DD/YYYY';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C466117_Organization_${getRandomPostfix()}`,
    };
    // The tag isolates the invoices of this test from the other invoices on the env
    testData.tag = { label: `at_c466117_tag_${getRandomPostfix()}` };
    testData.invoices = {};
    testData.users = {};

    const editInvoiceAndInvoiceLine = (user, invoice) => {
      cy.getUserToken(user.username, user.password);
      Invoices.getInvoiceByIdViaApi(invoice.id).then((invoiceBody) => {
        Invoices.updateInvoiceViaApi({
          ...invoiceBody,
          note: `AT_C466117_Note_${getRandomPostfix()}`,
        });
      });
      InvoiceLineDetails.getInvoiceLinesViaApi({ query: `invoiceId=="${invoice.id}"` }).then(
        ({ invoiceLines }) => {
          InvoiceLineDetails.updateInvoiceLineViaApi({
            ...invoiceLines[0],
            description: `AT_C466117_InvoiceLine_${getRandomPostfix()}`,
          });
        },
      );
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.createTagApi(testData.tag).then((tagId) => {
      testData.tag.id = tagId;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // Invoice #1 and Invoice #2 in "Open" status, each with one invoice line
    ['first', 'second'].forEach((key) => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        tags: [testData.tag.label],
      }).then((invoice) => {
        testData.invoices[key] = invoice;

        Invoices.createInvoiceLineViaApi(
          Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
          }),
        );
      });
    });

    ['first', 'second'].forEach((key) => {
      cy.createTempUser([]).then((userProperties) => {
        testData.users[key] = userProperties;

        cy.assignCapabilitiesToExistingUser(
          userProperties.userId,
          [],
          [CapabilitySets.uiInvoiceInvoiceEdit],
        );
      });
    });

    cy.then(() => {
      // User #2 edits Invoice #1 and its invoice line, then Invoice #2 and its invoice line
      editInvoiceAndInvoiceLine(testData.users.second, testData.invoices.first);
      editInvoiceAndInvoiceLine(testData.users.second, testData.invoices.second);
      // User #1 edits Invoice #1 and its invoice line
      editInvoiceAndInvoiceLine(testData.users.first, testData.invoices.first);

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
    cy.deleteTagApi(testData.tag.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C466117 Invoices and invoice lines can be found by "Updated by" and "Date updated" filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466117'] },
    () => {
      const firstInvoiceNo = testData.invoices.first.vendorInvoiceNo;
      const secondInvoiceNo = testData.invoices.second.vendorInvoiceNo;
      const today = DateTools.getCurrentDate();
      const yesterday = DateTools.getPreviousDayDate();
      const pastDateFrom = moment().subtract(10, 'days').format(DATE_FORMAT);
      const pastDateTo = moment().subtract(5, 'days').format(DATE_FORMAT);
      const dateEarlierThanFrom = moment().subtract(20, 'days').format(DATE_FORMAT);

      // Step 1: Click "Reset all" button on "Search & filter" pane
      Invoices.waitForFiltersLoaded();
      Invoices.clearAllFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 2-4: Expand "Updated by" facet, click "Find user" link, search for User #1 and select it
      Invoices.filterByUser(UPDATED_BY, testData.users.first.username);
      Invoices.verifyUserFilterSelected(UPDATED_BY, testData.users.first.username);
      Invoices.assertInvoicesInResults([firstInvoiceNo]);

      // Step 5: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Step 6: Click "Find user" link in "Updated by" facet, search for User #2 and select it
      Invoices.filterByUser(UPDATED_BY, testData.users.second.username);
      Invoices.verifyUserFilterSelected(UPDATED_BY, testData.users.second.username);
      Invoices.assertInvoicesInResults([secondInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([firstInvoiceNo]);

      // Step 7: Click "Find user" link, search for User #1 and select it
      Invoices.filterByUser(UPDATED_BY, testData.users.first.username);
      Invoices.verifyUserFilterSelected(UPDATED_BY, testData.users.first.username);
      Invoices.assertInvoicesInResults([firstInvoiceNo]);

      // Step 8: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 9-10: Expand "Updated by (Invoice Line)" facet, click "Find user" link, select User #1
      Invoices.filterByUser(UPDATED_BY_INVOICE_LINE, testData.users.first.username);
      Invoices.verifyUserFilterSelected(UPDATED_BY_INVOICE_LINE, testData.users.first.username);
      Invoices.assertInvoicesInResults([firstInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([secondInvoiceNo]);

      // Step 11: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Step 12: Click "Find user" link in "Updated by (Invoice Line)" facet, select User #2
      Invoices.filterByUser(UPDATED_BY_INVOICE_LINE, testData.users.second.username);
      Invoices.verifyUserFilterSelected(UPDATED_BY_INVOICE_LINE, testData.users.second.username);
      Invoices.assertInvoicesInResults([secondInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([firstInvoiceNo]);

      // Step 13: Click "x" icon next to "Updated by (Invoice Line)" filter
      Invoices.clearFilter(UPDATED_BY_INVOICE_LINE);
      Invoices.verifyChooseFilterMessage();

      // Steps 14-16: Expand "Date updated" facet, select today date in "From" and "To" fields, click "Apply"
      // The tag filter narrows the results to the invoices of this test
      Invoices.filterByTags([testData.tag.label]);
      Invoices.filterByDateRange(DATE_UPDATED, { from: today, to: today });
      Invoices.assertInvoicesInResults([firstInvoiceNo, secondInvoiceNo]);

      // Step 17: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 18-19: Select dates in the past in "From" and "To" fields, click "Apply"
      Invoices.filterByTags([testData.tag.label]);
      Invoices.filterByDateRange(DATE_UPDATED, { from: pastDateFrom, to: pastDateTo });
      Invoices.verifyNoResultsFound();

      // Step 20: Enter date in "To" field earlier than date in "From" field, click "Apply"
      Invoices.filterByDateRange(DATE_UPDATED, { to: dateEarlierThanFrom });
      Invoices.verifyDateRangeFilterError(DATE_UPDATED, START_DATE_GREATER_THAN_END_DATE_ERROR);
      Invoices.verifyNoResultsFound();

      // Step 21: Select yesterday date in "From" field, today date in "To" field, click "Apply"
      Invoices.filterByDateRange(DATE_UPDATED, { from: yesterday, to: today });
      Invoices.assertInvoicesInResults([firstInvoiceNo, secondInvoiceNo]);
    },
  );
});
