import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search lists', () => {
    let userData = {};
    const postfix = getRandomPostfix();

    const createdLists = [
      {
        name: `Missing Items Report ${postfix}`,
        description: 'Items missing from shelves since January',
        recordType: 'Items',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
      {
        name: `missing barcodes ${postfix}`,
        description: 'items without barcode assigned',
        recordType: 'Items',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
      {
        name: `Overdue Loans Q2 ${postfix}`,
        description: 'Loans overdue for more than 30 days',
        recordType: 'Loans',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
      {
        name: `Summer Reading Catalog ${postfix}`,
        description: 'Items tagged for summer reading program',
        recordType: 'Items',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
      {
        name: `New Users Onboarding ${postfix}`,
        description: 'Users created in the last 7 days',
        recordType: 'Users',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiOrganizationsViewEditDelete.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersDelete.gui,
      ]).then((userProperties) => {
        userData = userProperties;

        cy.getUserToken(userData.username, userData.password).then(() => {
          createdLists.forEach((list) => {
            Lists.createViaApi(list);
          });
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
      createdLists.forEach((list) => {
        Lists.deleteListByNameViaApi(list.name);
      });
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1434637 Verify search lists is case-insensitive and supports partial match (athena)',
      { tags: ['extendedPath', 'athena', 'C1434637'] },
      () => {
        // #1 Search "missing" (lowercase), press "Enter"
        Lists.fillInSearchField('missing');
        Lists.pressEnterInSearchField();
        Lists.verifyListIsPresent('Missing items');
        Lists.verifyListIsPresent(createdLists[0].name);
        Lists.verifyListIsPresent(createdLists[1].name);
        Lists.verifyListsPaneRecordsCountAtLeast(3);

        // #2 Search "ITEMS" (uppercase), click "Search"
        Lists.fillInSearchField('ITEMS');
        Lists.clickOnSearchButton();
        Lists.verifyListIsPresent('Missing items');
        Lists.verifyListIsPresent(createdLists[0].name);
        Lists.verifyListIsPresent(createdLists[1].name);
        Lists.verifyListIsPresent(createdLists[3].name);
        Lists.verifyListsPaneRecordsCount(4);

        // #3 Search "loan", click "Search" (partial match)
        Lists.fillInSearchField('loan');
        Lists.clickOnSearchButton();
        Lists.verifyListIsPresent(createdLists[2].name);
        Lists.verifyListIsPresent(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.verifyListsPaneRecordsCount(2);

        // #4 Search "catalog", click "Search" (matches anywhere in the field)
        Lists.fillInSearchField('catalog');
        Lists.clickOnSearchButton();
        Lists.verifyListIsPresent(createdLists[3].name);
        Lists.verifyListsPaneRecordsCount(1);

        // #5 Search "7 days", click "Search" (description-only match)
        Lists.fillInSearchField('7 days');
        Lists.clickOnSearchButton();
        Lists.verifyListIsPresent(createdLists[4].name);
        Lists.verifyListsPaneRecordsCount(1);

        // #6 Search "zzznofound", click "Search" (no results)
        Lists.fillInSearchField('zzznofound');
        Lists.clickOnSearchButton();
        Lists.verifyNoResultsFoundForSearchTerm('zzznofound');
        Lists.verifyListsPaneRecordsCount(0);
      },
    );
  });
});
