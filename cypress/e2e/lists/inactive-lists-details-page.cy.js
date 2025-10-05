import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  let userData = {};

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.listsAll.gui,
      Permissions.uiUsersViewRequests.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiUsersLoansViewRenewChangeDueDate.gui,
      Permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it('C411840 Inactive lists - Verify inactive list details page structure and functionality', 
    { tags: ['criticalPath', 'lists'] }, 
    () => {
      // Navigate to inactive lists page
      cy.visit('/lists?filters=status.Inactive&limit=100&offset=0');
      Lists.waitLoading();

      // Verify we're on the inactive lists page with inactive filter checked
      Lists.verifyInactiveFilterIsChecked();
      Lists.verifyListsPageDisplayed();

      // Step 1: Click on any of the inactive lists
      Lists.selectFirstInactiveList();
      
      // Verify list details page opens
      Lists.verifyListDetailsPageOpened();

      // Step 2: Check the structure of the lists details page
      // Verify title is displayed
      Lists.verifyListTitle();
      
      // Verify "X records found" is displayed under the title
      Lists.verifyRecordsFoundText();
      
      // Verify X button at top-left
      Lists.verifyCloseButtonExists();
      
      // Verify Actions dropdown at top-right
      Lists.verifyActionsButtonExists();
      
      // Verify List information accordion
      Lists.verifyListInformationAccordionExists();
      
      // Verify Query accordion
      Lists.verifyQueryAccordionExists();

      // Step 3: Click on "Actions" dropdown
      Lists.openActionsDropdown();
      
      // Verify dropdown options are displayed
      Lists.verifyActionsDropdownOptions();

      // Step 4: Check the buttons status
      // Verify inactive buttons (disabled)
      Lists.verifyRefreshListButtonIsDisabled();
      Lists.verifyExportVisibleColumnsButtonIsDisabled();
      Lists.verifyExportAllColumnsButtonIsDisabled();
      
      // Verify active buttons (enabled)
      Lists.verifyEditListButtonIsEnabled();
      Lists.verifyDuplicateListButtonIsEnabled();
      Lists.verifyDeleteListButtonIsEnabled();

      // Close actions dropdown by clicking elsewhere
      Lists.closeActionsDropdown();

      // Step 5: Click on "List information" dropdown (collapse)
      Lists.collapseListInformationAccordion();
      
      // Verify the accordion collapses
      Lists.verifyListInformationAccordionCollapsed();

      // Step 6: Click on "List information" dropdown again (expand)
      Lists.expandListInformationAccordion();
      
      // Verify the accordion expands and contains required information
      Lists.verifyListInformationAccordionExpanded();
      Lists.verifyListInformationContent();

      // Step 7: Click on "Query" dropdown (collapse)
      Lists.collapseQueryAccordion();
      
      // Verify the accordion collapses
      Lists.verifyQueryAccordionCollapsed();

      // Step 8: Click on "Query" dropdown again (expand)
      Lists.expandQueryAccordion();
      
      // Verify the accordion expands and shows query information
      Lists.verifyQueryAccordionExpanded();
      Lists.verifyQueryContent();

      // Step 9: Click on "X" button
      Lists.closeListDetailsPage();
      
      // Verify list details page closes and landing page opens
      Lists.verifyListDetailsPageClosed();
      Lists.verifyBackOnListsLandingPage();
      
      // Verify we're back on the lists landing page with inactive filter
      Lists.verifyInactiveFilterIsChecked();
      cy.url().should('include', 'lists?filters=status.Inactive');
    }
  );
});