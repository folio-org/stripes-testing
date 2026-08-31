import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('New list page', () => {
    let userData;
    const listName = `AT_C411711_List_${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411711 Verify that displays correct fields and labels in the "New list" page (athena)',
      { tags: ['criticalPath', 'athena', 'C411711'] },
      () => {
        // Step 1: Click on "Lists" in app navigation bar
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Step 2: Click on "New" button at the top-right of the page
        Lists.openNewListPane();
        cy.url().should('include', '/new');
        Lists.verifyListsPaneTitle('New list');
        Lists.verifyListsPaneSubTitle('Set criteria to build query');
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyCancelButtonIsActive();

        // Step 3: Click on "Build query" without adding List name
        Lists.verifyBuildQueryButtonIsDisabled();

        // Step 4: Add list name and click on "Build query"
        Lists.setName(listName);
        Lists.verifyBuildQueryButtonIsDisabled();

        // Step 5: Check the "List information" section
        Lists.verifyListInformationAccordionIsExpanded();

        // Step 6: Click on "Collapse all"
        Lists.clickOnCollapseAllButton();
        Lists.verifyListInformationAccordionIsExpanded(false);
        Lists.verifyCollapseAllButtonAbsent();

        // Step 7: Click on "Expand all"
        Lists.clickOnExpandAllButton();

        // Verify default values
        Lists.verifyVisibility('Shared', true);
        Lists.verifyVisibility('Private', false);
        Lists.verifyStatus('Active', true);
        Lists.verifyStatus('Inactive', false);

        // Step 8: Save without list name
        Lists.clearName();
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyEmptyListNameErrorMessage();

        // Step 9: Add list name
        Lists.setName(listName);
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyBuildQueryButtonIsDisabled();

        // Step 10: Add record type and save
        Lists.selectRecordType(Lists.recordTypes.loans);
        Lists.saveList();
        Lists.verifyListSavedCalloutMessage(listName);
        Lists.closeListDetailsPane();
      },
    );
  });
});
