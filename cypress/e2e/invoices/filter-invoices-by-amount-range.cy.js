import { INVOICE_FILTERS_LABELS } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { LOCK_TOTAL } = INVOICE_FILTERS_LABELS;
  // Invoice #1 - #7 lock total amounts (equal to their total amounts)
  const AMOUNTS = [11, 12, 13, 14, 15, 16, 0];
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C353231_Organization_${getRandomPostfix()}`,
    };
    testData.invoices = {};

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    AMOUNTS.forEach((amount) => {
      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        subTotal: amount,
      }).then(({ id }) => {
        // Re-read the invoice to get its current version after the invoice line was added
        Invoices.getInvoiceByIdViaApi(id).then((invoice) => {
          testData.invoices[amount] = invoice;

          Invoices.updateInvoiceViaApi({ ...invoice, lockTotal: amount });
        });
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
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C353231 Allow user to filter invoices by Amount range (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353231'] },
    () => {
      const invoicesWithAmounts = (amounts) => amounts.map((amount) => testData.invoices[amount].vendorInvoiceNo);

      // Step 1: Navigate to Invoices
      Invoices.waitForFiltersLoaded();
      Invoices.assertFilterAccordions(Object.values(INVOICE_FILTERS_LABELS));
      // Narrow the search down to the invoices of this test (the env has many other invoices with lock total)
      Invoices.selectVendorFilter(testData.organization);

      // Step 2: Expand Lock total accordion, specify "From" = 12 and "To" = 15
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '12', to: '15' });

      // Step 3: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([12, 13, 14, 15]));

      // Step 4: Specify "From" = 11 and "To" = 16
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '11', to: '16' });

      // Step 5: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([11, 12, 13, 14, 15, 16]));

      // Step 6: Specify "From" = 10 and "To" = 17
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '10', to: '17' });

      // Step 7: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([11, 12, 13, 14, 15, 16]));

      // Step 8: Specify "From" = 0 and "To" = 14
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '0', to: '14' });

      // Step 9: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0, 11, 12, 13, 14]));

      // Step 10: Specify "From" and "To" = 12
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '12', to: '12' });

      // Step 11: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([12]));

      // Step 12: Specify "From" = 10 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '10' });

      // Step 13: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([11, 12, 13, 14, 15, 16]));

      // Step 14: Specify "From" = 11 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '11' });

      // Step 15: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([11, 12, 13, 14, 15, 16]));

      // Step 16: Specify "From" = 12 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '12' });

      // Step 17: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([12, 13, 14, 15, 16]));

      // Step 18: Specify "From" = 0 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '0' });

      // Step 19: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts(AMOUNTS));

      // Step 20: Specify "From" = 16 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '16' });

      // Step 21: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([16]));

      // Step 22: Specify "From" = 17 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '17' });

      // Step 23: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.verifyNoResultsFound();

      // Step 24: Specify "From" = 15 and leave "To" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { from: '15' });

      // Step 25: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([15, 16]));

      // Step 26: Specify "To" = 16 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '16' });

      // Step 27: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts(AMOUNTS));

      // Step 28: Specify "To" = 17 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '17' });

      // Step 29: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts(AMOUNTS));

      // Step 30: Specify "To" = 15 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '15' });

      // Step 31: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0, 11, 12, 13, 14, 15]));

      // Step 32: Specify "To" = 11 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '11' });

      // Step 33: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0, 11]));

      // Step 34: Specify "To" = 12 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '12' });

      // Step 35: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0, 11, 12]));

      // Step 36: Specify "To" = 10 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '10' });

      // Step 37: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0]));

      // Step 38: Specify "To" = 0 and leave "From" blank
      Invoices.fillAmountRangeFilter(LOCK_TOTAL, { to: '0' });

      // Step 39: Click "Apply" button
      Invoices.applyAmountRangeFilter(LOCK_TOTAL);
      Invoices.assertInvoicesInResults(invoicesWithAmounts([0]));
    },
  );
});
