import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search lists', () => {
    const userData = {};
    const postfix = getRandomPostfix();
    const searchTerm = `Report${postfix}`;

    const listSharedLoans = {
      name: `${searchTerm} - Shared Loans`,
      description: `${searchTerm} - Shared Loans desc`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listSharedUsers = {
      name: `${searchTerm} - Shared Users`,
      description: `${searchTerm} - Shared Users desc`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listPrivateLoans = {
      name: `${searchTerm} - Private Loans`,
      description: `${searchTerm} - Private Loans desc`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };
    const listInactiveItems = {
      name: `${searchTerm} - Inactive Items`,
      description: `${searchTerm} - Inactive Items desc`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: false,
      isPrivate: false,
    };

    const newSharedListName = `${searchTerm} - New Shared`;
    const renamedSharedUsersName = `A ${searchTerm} - Shared Users`;
    const duplicatedLoansName = `${listSharedLoans.name} - copy`;

    const listsPermissions = [
      Permissions.listsAll.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(listsPermissions).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;

        cy.getUserToken(userData.username, userData.password).then(() => {
          Lists.createViaApi(listSharedLoans);
          Lists.createViaApi(listSharedUsers);
          Lists.createViaApi(listPrivateLoans);
          Lists.createViaApi(listInactiveItems);
        });
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      [
        listPrivateLoans.name,
        listInactiveItems.name,
        listSharedLoans.name,
        duplicatedLoansName,
        newSharedListName,
        renamedSharedUsersName,
      ].forEach((name) => Lists.deleteListByNameViaApi(name));
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1538701 Search term, filter, and sort order on Lists main pane persist through list actions, reload, and app navigation (athena)',
      { tags: ['extendedPath', 'athena', 'C1538701'] },
      () => {
        // #1 Search "Report<postfix>", filter by Visibility: Shared, reverse sort to descending
        Lists.fillInSearchField(searchTerm);
        Lists.clickOnSearchButton();
        Lists.clickOnCheckbox('Shared');
        Lists.clickLandingPageColumnHeader('List name');
        Lists.verifyDisplayedListsOrder([listSharedUsers.name, listSharedLoans.name]);
        Lists.verifyListsAreNotPresent([listPrivateLoans.name, listInactiveItems.name]);
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyAccordionExpandedInFilter('Status');
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyAccordionExpandedInFilter('Visibility');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyListsPaneRecordsCount(2);

        // #2 Open a list's details pane, then close it to go back to the main pane
        Lists.openList(listSharedUsers.name);
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([listSharedUsers.name, listSharedLoans.name]);
        Lists.verifyListsPaneRecordsCount(2);

        // #3 Create a new shared, active list and close it
        Lists.openNewListPane();
        Lists.setName(newSharedListName);
        Lists.setDescription(newSharedListName);
        Lists.selectRecordType('Users');
        Lists.selectVisibility('Shared');
        Lists.selectStatus('Active');
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${newSharedListName} saved.`);
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          listSharedUsers.name,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #4 Edit a list's name and close it
        Lists.openList(listSharedUsers.name);
        Lists.openActions();
        Lists.editList();
        Lists.setName(renamedSharedUsersName);
        Lists.saveList();
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          listSharedLoans.name,
          newSharedListName,
          renamedSharedUsersName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #5 Duplicate a list and close it
        Lists.openList(listSharedLoans.name);
        Lists.openActions();
        Lists.duplicateList();
        Lists.verifyListName(duplicatedLoansName);
        Lists.saveList();
        Lists.waitForCompilingToComplete();
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
          renamedSharedUsersName,
        ]);
        Lists.verifyListsPaneRecordsCount(4);

        // #6 Delete a list
        Lists.openList(renamedSharedUsersName);
        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #7 Navigate to another app, then back to Lists
        TopMenuNavigation.navigateToApp('Inventory');
        TopMenuNavigation.navigateToApp('Lists');
        Lists.waitLoading();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #8 Refresh the browser page
        cy.reload();
        Lists.waitLoading();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #9 Click the "Lists" app icon in the always-visible app navigation bar (app home)
        TopMenuNavigation.navigateToApp('Lists');
        Lists.waitLoading();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);

        // #10 Click the "Apps" icon in the header and select "Lists" ("if applicable" per the
        // test case: at this viewport width every app icon is already directly visible with no
        // separate waffle toggle to open, so this is the same action as step #9).
        TopMenuNavigation.navigateToApp('Lists');
        Lists.waitLoading();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyDisplayedListsOrder([
          duplicatedLoansName,
          listSharedLoans.name,
          newSharedListName,
        ]);
        Lists.verifyListsPaneRecordsCount(3);
      },
    );
  });
});
