import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    const listData = {
      name: `AT_C446046_${getTestEntityValue('list')}`,
      description: `AT_C446046_${getTestEntityValue('desc')}`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Lists.createViaApi(listData);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
    });

    it(
      'C446046 Verify that list name and list source display on a single line in the \'Lists landing\' page (corsair)',
      { tags: ['extendedPath', 'corsair', 'C446046'] },
      () => {
        cy.loginAsAdmin({ path: TopMenu.listsPath, waiter: Lists.waitLoading });

        // Step 1: Filter by "Items" record type
        Lists.selectRecordTypeFilter('Items');
        Lists.verifyListsFilteredByRecordType('Items');

        // Step 2: Verify that the Source column displays on a single line
        Lists.verifySourceColumnCellDisplaysOnSingleLine();

        // Reset filter and apply "Loans" filter
        Lists.resetAllFilters();

        // Step 3: Filter by "Loans" record type
        Lists.selectRecordTypeFilter('Loans');
        Lists.verifyListsFilteredByRecordType('Loans');

        // Step 4: Verify that the "Inactive patrons with open loans" list name displays on a single line
        Lists.verifyListNameCellDisplaysOnSingleLine('Inactive patrons with open loans');
      },
    );
  });
});
