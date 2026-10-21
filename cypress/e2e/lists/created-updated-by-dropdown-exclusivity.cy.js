import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Filter lists', () => {
    const createdByFilter = { accordionName: 'Created by' };
    const updatedByFilter = { accordionName: 'Updated by' };

    const userOne = {};
    const userTwo = {};
    const userThree = {};

    // userOne creates List A and never touches it again (so they never become its "Updated by").
    // userTwo subsequently edits List A's description and never creates a list of their own, so
    // they only ever show up as an "Updated by" value, never as a "Created by" one.
    const listA = {
      name: `C1538700-${getTestEntityValue('list')}-A`,
      description: `C1538700-${getTestEntityValue('desc')}-A`,
      recordType: 'Loans',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    const buildUpdateBody = (body, description) => ({
      name: body.name,
      description,
      entityTypeId: body.entityTypeId,
      fqlQuery: body.fqlQuery,
      fields: body.fields,
      queryId: body.queryId,
      isActive: body.isActive,
      isPrivate: body.isPrivate,
      version: body.version,
    });

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
          Lists.createViaApi(listA).then((body) => {
            listA.id = body.id;
          });
        });
      });
      cy.createTempUser(listsPermissions).then((userProperties) => {
        userTwo.username = userProperties.username;
        userTwo.password = userProperties.password;
        userTwo.userId = userProperties.userId;
      });
      cy.createTempUser([]).then((userProperties) => {
        userThree.username = userProperties.username;
        userThree.userId = userProperties.userId;
      });

      cy.then(() => {
        cy.getUserToken(userTwo.username, userTwo.password);
        Lists.getListByIdViaApi(listA.id).then((body) => {
          Lists.editViaApi(listA.id, buildUpdateBody(body, `${listA.description} edited`));
        });
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
      Lists.deleteViaApi(listA.id);
      cy.getAdminToken();
      Users.deleteViaApi(userOne.userId);
      Users.deleteViaApi(userTwo.userId);
      Users.deleteViaApi(userThree.userId);
    });

    it(
      'C1538700 Created by and Updated by dropdowns list only users who performed that specific action on a list (athena)',
      { tags: ['extendedPath', 'athena', 'C1538700'] },
      () => {
        // #1 Click on the "Created by" accordion
        Lists.clickOnAccordionInFilter(createdByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(createdByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(createdByFilter.accordionName);
        // #2 Click multiselect dropdown under "Created by"
        Lists.openUserFilterDropdown(createdByFilter.accordionName);
        Lists.verifyUserFilterDropdownContainsUser(userOne.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userTwo.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userThree.username);
        // #3 Select User 1 from the "Created by" dropdown
        Lists.selectUsersInFilter(createdByFilter.accordionName, [userOne.username]);
        Lists.verifyClearFilterButton(createdByFilter.accordionName);
        Lists.verifyUserChipDisplayed(createdByFilter.accordionName, userOne.username);
        Lists.verifyListIsPresent(listA.name);
        Lists.verifyListsPaneRecordsCount(1);
        // #4 Reset "Created by", then click on the "Updated by" accordion
        Lists.clickOnClearFilterButton(createdByFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(createdByFilter.accordionName);
        Lists.clickOnAccordionInFilter(updatedByFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(updatedByFilter.accordionName);
        Lists.verifyUserFilterMultiSelectDropdownDisplayed(updatedByFilter.accordionName);
        // #5 Click multiselect dropdown under "Updated by"
        Lists.openUserFilterDropdown(updatedByFilter.accordionName);
        Lists.verifyUserFilterDropdownContainsUser(userTwo.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userOne.username);
        Lists.verifyUserFilterDropdownDoesNotContainUser(userThree.username);
        // #6 Select User 2 from the "Updated by" dropdown
        Lists.selectUsersInFilter(updatedByFilter.accordionName, [userTwo.username]);
        Lists.verifyClearFilterButton(updatedByFilter.accordionName);
        Lists.verifyUserChipDisplayed(updatedByFilter.accordionName, userTwo.username);
        Lists.verifyListIsPresent(listA.name);
        Lists.verifyListsPaneRecordsCount(1);
        // #7 With "Updated by" = User 2 still applied, select User 1 from "Created by" accordion
        // ("Created by" is already expanded since step #1 - clearing it in step #4 only cleared
        // its selection, it did not collapse the accordion).
        Lists.openUserFilterDropdown(createdByFilter.accordionName);
        Lists.selectUsersInFilter(createdByFilter.accordionName, [userOne.username]);
        Lists.verifyClearFilterButton(createdByFilter.accordionName);
        Lists.verifyClearFilterButton(updatedByFilter.accordionName);
        Lists.verifyListIsPresent(listA.name);
        Lists.verifyListsPaneRecordsCount(1);
        Lists.verifyResetAllButtonEnabled();
        // #8 Click "Reset all"
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();
        Lists.verifyClearFilterButtonAbsent(createdByFilter.accordionName);
        Lists.verifyClearFilterButtonAbsent(updatedByFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(createdByFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(updatedByFilter.accordionName);
      },
    );
  });
});
