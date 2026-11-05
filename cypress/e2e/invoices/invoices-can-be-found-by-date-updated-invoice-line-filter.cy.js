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
  const { DATE_UPDATED_INVOICE_LINE } = INVOICE_FILTERS_LABELS;
  const START_DATE_GREATER_THAN_END_DATE_ERROR = 'Start date is greater than end date';
  const DATE_FORMAT = 'MM/DD/YYYY';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C466122_Organization_${getRandomPostfix()}`,
    };
    // The tag isolates the invoices of this test from the other invoices on the env
    testData.tag = { label: `at_c466122_tag_${getRandomPostfix()}` };
    testData.invoices = {};

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.createTagApi(testData.tag).then((tagId) => {
      testData.tag.id = tagId;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    ['first', 'second'].forEach((key) => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        tags: [testData.tag.label],
      }).then((invoice) => {
        testData.invoices[key] = invoice;
      });
    });

    cy.then(() => {
      // Invoice #1 in "Open" status with one invoice line, the invoice line is edited today
      Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: testData.invoices.first.id,
          invoiceLineStatus: testData.invoices.first.status,
        }),
      ).then((invoiceLine) => {
        InvoiceLineDetails.updateInvoiceLineViaApi({
          ...invoiceLine,
          description: `AT_C466122_InvoiceLine_${getRandomPostfix()}`,
        });
      });

      // Invoice #2 in "Open" status without invoice lines is edited today
      Invoices.getInvoiceByIdViaApi(testData.invoices.second.id).then((invoice) => {
        Invoices.updateInvoiceViaApi({ ...invoice, note: `AT_C466122_Note_${getRandomPostfix()}` });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceView],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Object.values(testData.invoices).forEach((invoice) => Invoices.deleteInvoiceViaApi(invoice.id));
    cy.deleteTagApi(testData.tag.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C466122 Invoice lines can be found by "Date updated (Invoice line)" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466122'] },
    () => {
      const firstInvoiceNo = testData.invoices.first.vendorInvoiceNo;
      const secondInvoiceNo = testData.invoices.second.vendorInvoiceNo;
      const today = DateTools.getCurrentDate();
      const yesterday = DateTools.getPreviousDayDate();
      const pastDateFrom = moment().subtract(10, 'days').format(DATE_FORMAT);
      const pastDateTo = moment().subtract(5, 'days').format(DATE_FORMAT);
      const dateEarlierThanFrom = moment().subtract(20, 'days').format(DATE_FORMAT);

      Invoices.waitForFiltersLoaded();

      // Step 1: Click "Reset all" button on "Search & filter" pane
      Invoices.clearAllFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 2-5: Expand "Date updated (Invoice Line)" facet, select today date in "From" and "To" fields, click "Apply"
      // The tag filter narrows the results to the invoices of this test
      Invoices.filterByTags([testData.tag.label]);
      Invoices.filterByDateRange(DATE_UPDATED_INVOICE_LINE, { from: today, to: today });
      Invoices.assertInvoicesInResults([firstInvoiceNo]);
      Invoices.verifyInvoicesAbsentInResults([secondInvoiceNo]);

      // Step 6: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.verifyChooseFilterMessage();

      // Steps 7-8: Select dates in the past in "From" and "To" fields, click "Apply"
      Invoices.filterByTags([testData.tag.label]);
      Invoices.filterByDateRange(DATE_UPDATED_INVOICE_LINE, { from: pastDateFrom, to: pastDateTo });
      Invoices.verifyNoResultsFound();

      // Step 9: Enter date in "To" field earlier than date in "From" field, click "Apply"
      Invoices.filterByDateRange(DATE_UPDATED_INVOICE_LINE, { to: dateEarlierThanFrom });
      Invoices.verifyDateRangeFilterError(
        DATE_UPDATED_INVOICE_LINE,
        START_DATE_GREATER_THAN_END_DATE_ERROR,
      );
      Invoices.verifyNoResultsFound();

      // Step 10: Select yesterday date in "From" field, today date in "To" field, click "Apply"
      Invoices.filterByDateRange(DATE_UPDATED_INVOICE_LINE, { from: yesterday, to: today });
      Invoices.assertInvoicesInResults([firstInvoiceNo]);
    },
  );
});
