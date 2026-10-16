import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Filter lists', () => {
    const updatedByFilter = { accordionName: 'Updated by' };

    const userOne = {};
    const userTwo = {};
    const userThree = {};

    // Creating a list also sets its "Updated by" to the creator, so userOne/userTwo each
    // creating one list of their own already satisfies "has updated at least one list".
    const userOneList = {
      name: `C1434643-${getTestEntityValue('list')}-1`,
      description: `C1434643-${getTestEntityValue('desc')}-1`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const userTwoList = {
      name: `C1434643-${getTestEntityValue('list')}-2`,
      description: `C1434643-${getTestEntityValue('desc')}-2`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

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
        userOne.username = userProperties.username;
        userOne.password = userProperties.password;
        userOne.userId = userProperties.userId;

        cy.getUserToken(userOne.username, userOne.password).then(() => {
          Lists.createViaApi(userOneList);
        });
      });
      cy.createTempUser(listsPermissions).then((userProperties) => {
        userTwo.username = userProperties.username;
        userTwo.password = userProperties.password;
        userTwo.userId = userProperties.userId;

        cy.getUserToken(userTwo.username, userTwo.password).then(() => {
          Lists.createViaApi(userTwoList);
        });
      });
      cy.createTempUser([]).then((userProperties) => {
        userThree.username = userProperties.username;
        userThree.userId = userProperties.userId;
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(userOne.username, userOne.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getUserToken(userOne.username, userOne.password);
      Lists.deleteListByNameViaApi(userOneList.name);
      cy.getUserToken(userTwo.username, userTwo.password);
      Lists.deleteListByNameViaApi(userTwoList.name);
      cy.getAdminToken();
      Users.deleteViaApi(userOne.userId);
      Users.deleteViaApi(userTwo.userId);
      Users.deleteViaApi(userThree.userId);
    });

    it(
      'C1434643 Filter section: Updated by (athena)',
      { tags: ['extendedPath', 'athena', 'C1434643'] },
      () => {
        // #1 Click on "Updated by" accordion
        Lists.clickOnAccordionInFilter(updatedByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(updatedByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(updatedByFilter.accordionName);
        Lists.verifyStatusAccordionDefaultContent();
        // #2 Click multiselect dropdown under "Updated by"
        Lists.openUserFilterDropdown(updatedByFilter.accordionName);
        Lists.verifyUserFilterDropdownContainsUser(userOne.username);
        Lists.verifyUserFilterDropdownContainsUser(userTwo.username);
        Lists.verifyUserFilterDropdownOptionsSortedAlphabetically();
        // #3 Type into the search box to retrieve User 1, press "Enter"
        Lists.selectUserInFilterByTypingAndEnter(updatedByFilter.accordionName, userOne.username);
        Lists.verifyClearFilterButton(updatedByFilter.accordionName);
        Lists.verifyUserChipDisplayed(updatedByFilter.accordionName, userOne.username);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsArePresent([userOneList.name]);
        Lists.verifyListsAreNotPresent([userTwoList.name]);
        // #4 Click on "x" button next to User 1 name
        Lists.removeUserFromFilter(updatedByFilter.accordionName, userOne.username);
        Lists.verifyClearFilterButtonAbsent(updatedByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(updatedByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(updatedByFilter.accordionName);
        Lists.verifyResetAllButtonDisabled();
        // #5 Click multiselect dropdown, select User 1 and User 2
        Lists.openUserFilterDropdown(updatedByFilter.accordionName);
        Lists.selectUsersInFilter(updatedByFilter.accordionName, [
          userOne.username,
          userTwo.username,
        ]);
        Lists.verifyClearFilterButton(updatedByFilter.accordionName);
        Lists.verifyUserChipDisplayed(updatedByFilter.accordionName, userOne.username);
        Lists.verifyUserChipDisplayed(updatedByFilter.accordionName, userTwo.username);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsArePresent([userOneList.name, userTwoList.name]);
        // #6 Click on "x" button next to "Updated by" accordion
        Lists.clickOnClearFilterButton(updatedByFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(updatedByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(updatedByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(updatedByFilter.accordionName);
        Lists.verifyResetAllButtonDisabled();
        // #7 Click multiselect dropdown, type a name of a user who never updated a list
        Lists.openUserFilterDropdown(updatedByFilter.accordionName);
        Lists.searchUserInFilterDropdown(updatedByFilter.accordionName, userThree.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userThree.username);
        Lists.verifyRecordTypeFilterDropdownNoMatchingItem();
        // #8 Clear the search box, select User 2, then collapse the accordion
        Lists.searchUserInFilterDropdown(updatedByFilter.accordionName, '');
        Lists.selectUsersInFilter(updatedByFilter.accordionName, [userTwo.username]);
        Lists.clickOnAccordionInFilter(updatedByFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(updatedByFilter.accordionName);
        Lists.verifyClearFilterButton(updatedByFilter.accordionName);
        // #9 Click "Reset all"
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();
        Lists.verifyAccordionCollapsedInFilter(updatedByFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(updatedByFilter.accordionName);
      },
    );
  });
});
