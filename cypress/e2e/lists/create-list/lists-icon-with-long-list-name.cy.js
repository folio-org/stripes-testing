import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Create list', () => {
    // 210 characters long list name with a unique, identifiable prefix
    const listName = `AT_C411700_${getRandomPostfix()}_${'A'.repeat(210)}`.slice(0, 210);

    before('Login', () => {
      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
    });

    it(
      'C411700 Verify that the "Lists" icon remains the same in case of long ListName (corsair)',
      { tags: ['extendedPath', 'corsair', 'C411700'] },
      () => {
        // #1 Click on "New" at the top-right of the page
        // Opens "New list" page
        Lists.openNewListPane();

        // #2 Add a list name up to 210 characters long, select record type and save the changes
        // Displays toast message "List 'Listname' saved", the listname displays at the top of the
        // page and the list icon displays next to the listname
        Lists.setName(listName);
        Lists.selectRecordType('Users');
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        Lists.verifyListDetailsHeaderWithIcon(listName);
      },
    );
  });
});
