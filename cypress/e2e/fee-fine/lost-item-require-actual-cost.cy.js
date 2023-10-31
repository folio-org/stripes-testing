import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

describe('Lost items requiring actual cost', () => {
  // Test data object to hold created entities
  const testData = {};

  before('Create test data', () => {
    // Create test user with required permissions
    cy.createTempUser([
      Permissions.uiUserAccounts.gui,
      Permissions.uiUsersProcessLostItemsRequiringActualCost.gui,
    ]).then((user) => {
      testData.user = user;
    });

    // Login as test user
    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
  });

  after('Delete test data', () => {
    // Delete test user
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C365607 Verify that filters on "Lost items requiring actual cost" page work (vega) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.vega] },
    () => {
      // Navigate to lost items page
      Invoices.navigateToLostItems();
      InvoiceView.waitLoading();

      // Verify initial filter options
      InvoiceView.checkLossTypeFilters(['Aged to lost', 'Declared lost']);

      // Apply 'Aged to lost' filter
      InvoiceView.filterByLossType('Aged to lost');
      InvoiceView.verifyResultsByLossType('Aged to lost');

      // Remove 'Aged to lost' filter
      InvoiceView.filterByLossType('Aged to lost');
      InvoiceView.verifyNoResultsFound();

      // Apply 'Declared lost' filter
      InvoiceView.filterByLossType('Declared lost');
      InvoiceView.verifyResultsByLossType('Declared lost');

      // Remove 'Declared lost' filter
      InvoiceView.filterByLossType('Declared lost');
      InvoiceView.verifyNoResultsFound();

      // Apply both filters
      InvoiceView.filterByLossType(['Aged to lost', 'Declared lost']);
      InvoiceView.verifyResultsByLossType(['Aged to lost', 'Declared lost']);

      // Reset filters
      InvoiceView.resetFilters();
      InvoiceView.verifyNoResultsFound();

      // Verify filters on user details page
      cy.visit(Users.previewUserUrl(testData.user.userId));
      Users.openActionsMenu();
      Users.clickLostItemsAction();
      InvoiceView.waitLoading();
      InvoiceView.checkLossTypeFilters(['Aged to lost', 'Declared lost']);
    },
  );
});
