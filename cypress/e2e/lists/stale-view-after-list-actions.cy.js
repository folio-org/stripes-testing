import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search lists', () => {
    const userA = {};
    const userB = {};
    const postfix = getRandomPostfix();
    const prefix = `L277${postfix}`;
    const searchTerm = prefix;
    const cannedSystemList = 'Missing items';

    const listActiveShared = {
      name: `${prefix} Active shared`,
      description: `${prefix} Active shared desc`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listInactiveShared = {
      name: `${prefix} Inactive shared`,
      description: `${prefix} Inactive shared desc`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: false,
      isPrivate: false,
    };
    const listActivePrivate = {
      name: `${prefix} Active private`,
      description: `${prefix} Active private desc`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };
    const listCreatedByUserB = {
      name: `${prefix} Created by User B`,
      description: `${prefix} Created by User B desc`,
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listUsersType = {
      name: `${prefix} Users type`,
      description: `${prefix} Users type desc`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    const newInactiveName = `${prefix} New inactive`;
    const newItemsName = `${prefix} New items`;
    const duplicateOfUserBName = `${prefix} Duplicate of User B list`;
    const duplicateOfSystemName = `${prefix} Duplicate of system list`;
    const activeSharedEditedName = `${prefix} Active shared edited to private`;

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
        userA.username = userProperties.username;
        userA.password = userProperties.password;
        userA.userId = userProperties.userId;

        cy.getUserToken(userA.username, userA.password).then(() => {
          Lists.createViaApi(listActiveShared);
          Lists.createViaApi(listInactiveShared);
          Lists.createViaApi(listActivePrivate);
          Lists.createViaApi(listUsersType);
        });
      });
      cy.createTempUser(listsPermissions).then((userProperties) => {
        userB.username = userProperties.username;
        userB.password = userProperties.password;
        userB.userId = userProperties.userId;

        cy.getUserToken(userB.username, userB.password).then(() => {
          Lists.createViaApi(listCreatedByUserB);
        });
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(userA.username, userA.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getUserToken(userA.username, userA.password);
      [
        activeSharedEditedName,
        listInactiveShared.name,
        listActivePrivate.name,
        listUsersType.name,
        newInactiveName,
        newItemsName,
        duplicateOfUserBName,
        duplicateOfSystemName,
      ].forEach((name) => Lists.deleteListByNameViaApi(name));
      cy.getUserToken(userB.username, userB.password);
      Lists.deleteListByNameViaApi(listCreatedByUserB.name);
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
    });

    it(
      'C1559263 Lists not matching Search & filter after add, duplicate and edit actions are not displayed in the main pane until they match Search & filter (athena)',
      { tags: ['extendedPath', 'athena', 'C1559263'] },
      () => {
        // #1 Check the "Search & filter" pane
        cy.contains('Visibility').should('be.visible');
        cy.contains('Source').should('be.visible');
        cy.contains('Created by').should('be.visible');
        cy.contains('Updated by').should('be.visible');
        cy.contains('Record types').should('be.visible');
        Lists.verifyStatusAccordionDefaultContent();

        // #2 Search "<prefix>"
        Lists.fillInSearchField(searchTerm);
        Lists.clickOnSearchButton();
        Lists.verifyListsPaneRecordsCount(4);
        Lists.verifyDisplayedListsOrder([
          listActivePrivate.name,
          listActiveShared.name,
          listCreatedByUserB.name,
          listUsersType.name,
        ]);
        Lists.verifyListsAreNotPresent([listInactiveShared.name]);

        // #3 Create a list that does not match the Status filter (Inactive)
        Lists.openNewListPane();
        Lists.setName(newInactiveName);
        Lists.setDescription(newInactiveName);
        Lists.selectRecordType('Items');
        Lists.selectVisibility('Shared');
        Lists.selectStatus('Inactive');
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${newInactiveName} saved.`);
        Lists.verifyNoRecordsInListDetails();

        // #4 Close the new list form and return to the main pane
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyListsPaneRecordsCount(4);
        Lists.verifyDisplayedListsOrder([
          listActivePrivate.name,
          listActiveShared.name,
          listCreatedByUserB.name,
          listUsersType.name,
        ]);
        Lists.verifyListsAreNotPresent([newInactiveName]);

        // #5 Check "Inactive" in the Status accordion
        Lists.clickOnCheckbox('Inactive');
        Lists.verifyListsPaneRecordsCount(6);
        Lists.verifyDisplayedListsOrder([
          listActivePrivate.name,
          listActiveShared.name,
          listCreatedByUserB.name,
          listInactiveShared.name,
          newInactiveName,
          listUsersType.name,
        ]);

        // #6 Uncheck "Inactive", check "Shared" under Visibility
        Lists.clickOnCheckbox('Inactive');
        Lists.clickOnCheckbox('Shared');
        Lists.verifyListsPaneRecordsCount(3);
        Lists.verifyDisplayedListsOrder([
          listActiveShared.name,
          listCreatedByUserB.name,
          listUsersType.name,
        ]);
        Lists.verifyListsAreNotPresent([listActivePrivate.name]);

        // #7 Edit "Active shared" list: Visibility = Private, rename it
        Lists.openList(listActiveShared.name);
        Lists.openActions();
        Lists.editList();
        Lists.selectVisibility('Private');
        Lists.setName(activeSharedEditedName);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${activeSharedEditedName} saved.`);

        // #8 Return to the main pane
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyListsPaneRecordsCount(2);
        Lists.verifyDisplayedListsOrder([listCreatedByUserB.name, listUsersType.name]);
        Lists.verifyListsAreNotPresent([activeSharedEditedName]);

        // #9 Uncheck "Shared"; select "Users" under Record types
        Lists.clickOnCheckbox('Shared');
        Lists.openRecordTypeFilter();
        Lists.selectRecordTypeFilter('Users');
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyListIsPresent(listUsersType.name);

        // #10 Create a list that does not match the Record types filter (Items)
        Lists.openNewListPane();
        Lists.setName(newItemsName);
        Lists.setDescription(newItemsName);
        Lists.selectRecordType('Items');
        Lists.selectVisibility('Shared');
        Lists.selectStatus('Active');
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${newItemsName} saved.`);
        Lists.waitForCompilingToComplete();

        // #11 Close the new list form and return to the main pane
        Lists.closeListDetailsPane();
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyListIsPresent(listUsersType.name);
        Lists.verifyListsAreNotPresent([newItemsName]);

        // #12 Unselect "Users"; select User B under "Created by"
        Lists.deselectRecordTypeFilter('Users');
        Lists.clickOnAccordionInFilter('Created by');
        Lists.openUserFilterDropdown('Created by');
        Lists.selectUsersInFilter('Created by', [userB.username]);
        Lists.verifyUserChipDisplayed('Created by', userB.username);
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyListIsPresent(listCreatedByUserB.name);

        // #13 Duplicate "Created by User B" list, rename the copy
        Lists.openList(listCreatedByUserB.name);
        Lists.openActions();
        Lists.duplicateList();
        Lists.clearName();
        Lists.setName(duplicateOfUserBName);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${duplicateOfUserBName} saved.`);
        Lists.waitForCompilingToComplete();

        // #14 Close the duplicate and return to the main pane
        Lists.closeListDetailsPane();
        Lists.verifyAccordionExpandedInFilter('Created by');
        Lists.verifyUserChipDisplayed('Created by', userB.username);
        Lists.verifySearchFieldValue(searchTerm);
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyListIsPresent(listCreatedByUserB.name);
        Lists.verifyListsAreNotPresent([duplicateOfUserBName]);

        // #15 Clear User B in "Created by"; select User B under "Updated by"
        Lists.clickOnClearFilterButton('Created by');
        Lists.clickOnAccordionInFilter('Updated by');
        Lists.openUserFilterDropdown('Updated by');
        Lists.selectUsersInFilter('Updated by', [userB.username]);
        Lists.verifyUserChipDisplayed('Updated by', userB.username);
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyListIsPresent(listCreatedByUserB.name);

        // #16 Edit "Created by User B" list's description
        Lists.openList(listCreatedByUserB.name);
        Lists.openActions();
        Lists.editList();
        Lists.setDescription(`${listCreatedByUserB.description} edited`);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listCreatedByUserB.name} saved.`);

        // #17 Return to the main pane - User B is no longer any list's current updater
        Lists.closeListDetailsPane();
        Lists.verifyAccordionExpandedInFilter('Updated by');
        Lists.verifyClearFilterButton('Updated by');
        Lists.verifyListsPaneRecordsCount(0);
        Lists.verifyNoResultsFoundForSearchTerm(searchTerm);

        // #18 Select User A under "Updated by"
        Lists.openUserFilterDropdown('Updated by');
        Lists.selectUsersInFilter('Updated by', [userA.username]);
        Lists.verifyListsPaneRecordsCount(6);
        Lists.verifyDisplayedListsOrder([
          listActivePrivate.name,
          activeSharedEditedName,
          listCreatedByUserB.name,
          duplicateOfUserBName,
          newItemsName,
          listUsersType.name,
        ]);
        Lists.verifyListsAreNotPresent([listInactiveShared.name, newInactiveName]);

        // #19 Clear "Updated by", clear the search box, check "System" under Source
        Lists.clickOnClearFilterButton('Updated by');
        cy.get('#input-record-search').clear();
        Lists.pressEnterInSearchField();
        Lists.clickOnCheckbox('System');
        Lists.verifyListIsPresent(cannedSystemList);
        Lists.verifyListsFilteredBySource(['System']);
        Lists.getListsPaneRecordsCount().as('systemListsCount');

        // #20 Duplicate the system list
        Lists.openList(cannedSystemList);
        Lists.openActions();
        Lists.duplicateList();
        Lists.clearName();
        Lists.setName(duplicateOfSystemName);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${duplicateOfSystemName} saved.`);
        Lists.waitForCompilingToComplete();

        // #21 Close the duplicate and return to the main pane
        Lists.closeListDetailsPane();
        cy.get('@systemListsCount').then((systemListsCount) => {
          Lists.verifyListsPaneRecordsCount(systemListsCount);
        });
        Lists.verifyListsAreNotPresent([duplicateOfSystemName]);

        // #22 Uncheck "System"; search "<prefix>" again
        Lists.clickOnCheckbox('System');
        Lists.fillInSearchField(searchTerm);
        Lists.clickOnSearchButton();
        Lists.verifyListsPaneRecordsCount(7);
        Lists.verifyDisplayedListsOrder([
          listActivePrivate.name,
          activeSharedEditedName,
          listCreatedByUserB.name,
          duplicateOfSystemName,
          duplicateOfUserBName,
          newItemsName,
          listUsersType.name,
        ]);
      },
    );
  });
});
