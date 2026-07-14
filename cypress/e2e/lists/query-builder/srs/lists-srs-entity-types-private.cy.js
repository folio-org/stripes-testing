import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Lists', () => {
  describe('SRS', () => {
    before('Login', () => {
      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    it(
      'C788713 Verify that the entity types SRS Authority, Simple SRS record and SRS Bib are private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C788713'] },
      () => {
        // #1 Go to the "Lists" app and click on "New" button
        Lists.openNewListPane();

        // #2 Click on "Select record type" dropdown and search for "SRS Authority"
        Lists.openRecordTypeDropdownAndSearchOption('SRS Authority');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // #3 Delete the value and search for "Simple SRS record"
        Lists.searchOptionInRecordTypeDropdown('Simple SRS record');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // #4 Delete the value and search for "SRS Bib"
        Lists.searchOptionInRecordTypeDropdown('SRS Bib');
        Lists.verifyRecordTypeAbsentInDropdownOptions();
      },
    );
  });
});
