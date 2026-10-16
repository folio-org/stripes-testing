import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Filter lists', () => {
    const createdByFilter = { accordionName: 'Created by' };
    const visibilityFilter = { accordionName: 'Visibility' };

    const userOne = {};
    const userTwo = {};
    const userThree = {};

    // userOne and userTwo each create exactly one shared list, so the "No records found" check
    // in step #7 (Created by + Visibility: Private) is guaranteed rather than coincidental.
    const userOneList = {
      name: `C1434642-${getTestEntityValue('list')}-1`,
      description: `C1434642-${getTestEntityValue('desc')}-1`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const userTwoList = {
      name: `C1434642-${getTestEntityValue('list')}-2`,
      description: `C1434642-${getTestEntityValue('desc')}-2`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    // Loans entity type FQM joins reference inventory/orders data, so creating a "Loans" list
    // needs this broader permission set (mirrors the one already proven in filter-lists.cy.js),
    // not just "Lists" + "Users: View loans".
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
      'C1434642 Filter section: Created by (athena)',
      { tags: ['extendedPath', 'athena', 'C1434642'] },
      () => {
        // #1 Click on "Created by" accordion
        Lists.clickOnAccordionInFilter(createdByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(createdByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(createdByFilter.accordionName);
        Lists.verifyStatusAccordionDefaultContent();
        // #2 Click multiselect dropdown under "Created by"
        Lists.openUserFilterDropdown(createdByFilter.accordionName);
        Lists.verifyUserFilterDropdownContainsUser(userOne.username);
        Lists.verifyUserFilterDropdownContainsUser(userTwo.username);
        Lists.verifyUserFilterDropdownOptionsSortedAlphabetically();
        // #3 Select User 1 and User 2 from Preconditions in multiselect dropdown under "Created by"
        Lists.selectUsersInFilter(createdByFilter.accordionName, [
          userOne.username,
          userTwo.username,
        ]);
        Lists.verifyClearFilterButton(createdByFilter.accordionName);
        Lists.verifyUserChipDisplayed(createdByFilter.accordionName, userOne.username);
        Lists.verifyUserChipDisplayed(createdByFilter.accordionName, userTwo.username);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsArePresent([userOneList.name, userTwoList.name]);
        // #4 Click on "x" button next to User 1 name
        Lists.removeUserFromFilter(createdByFilter.accordionName, userOne.username);
        Lists.verifyUserChipAbsent(createdByFilter.accordionName, userOne.username);
        Lists.verifyUserChipDisplayed(createdByFilter.accordionName, userTwo.username);
        Lists.verifyClearFilterButton(createdByFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsArePresent([userTwoList.name]);
        Lists.verifyListsAreNotPresent([userOneList.name]);
        // #5 Click on "x" button next to "Created by" accordion
        Lists.clickOnClearFilterButton(createdByFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(createdByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(createdByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(createdByFilter.accordionName);
        Lists.verifyResetAllButtonDisabled();
        // #6 Click multiselect dropdown, type to retrieve User 1, press "Enter"
        Lists.selectUserInFilterByTypingAndEnter(createdByFilter.accordionName, userOne.username);
        Lists.verifyClearFilterButton(createdByFilter.accordionName);
        Lists.verifyUserChipDisplayed(createdByFilter.accordionName, userOne.username);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsArePresent([userOneList.name]);
        Lists.verifyListsAreNotPresent([userTwoList.name]);
        // #7 Check "Private" under "Visibility" accordion
        Lists.clickOnCheckbox('Private');
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyListsPaneRecordsCount(0);
        Lists.verifyResetAllButtonEnabled();
        // #8 Click "Reset all"
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();
        Lists.verifyClearFilterButtonAbsent(visibilityFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(createdByFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(createdByFilter.accordionName);
        // #9 Expand "Created by", open the dropdown, type a name of a user who never created a list
        Lists.clickOnAccordionInFilter(createdByFilter.accordionName);
        Lists.openUserFilterDropdown(createdByFilter.accordionName);
        Lists.searchUserInFilterDropdown(createdByFilter.accordionName, userThree.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userThree.username);
        Lists.verifyRecordTypeFilterDropdownNoMatchingItem();
        // #10 Click on "Created by" accordion
        Lists.clickOnAccordionInFilter(createdByFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(createdByFilter.accordionName);
      },
    );
  });
});
