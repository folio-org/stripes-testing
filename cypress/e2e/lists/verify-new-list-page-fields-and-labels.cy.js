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

        // Verify default values
        Lists.verifyVisibility('Shared', true);
        Lists.verifyVisibility('Private', false);
        Lists.verifyStatus('Active', true);
        Lists.verifyStatus('Inactive', false);

        // Step 4: Check the "List information" section, check there is no "Collapse all" button on the page
        Lists.verifyListInformationAccordionIsExpanded();
        Lists.verifyCollapseAllButtonAbsent();

        // Step 5: Click on "List information" accordion to collapse it
        Lists.clickOnListInformationAccordion();
        Lists.verifyListInformationAccordionIsExpanded(false);

        // Step 6: Click on "List information" accordion to expand it
        Lists.clickOnListInformationAccordion();
        Lists.verifyListInformationAccordionIsExpanded();

        // Step 7: Save without list names
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyEmptyListNameErrorMessage();

        // Step 8: Add list name and click on "Build query"
        Lists.setName(listName);
        Lists.verifyBuildQueryButtonIsDisabled();

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
