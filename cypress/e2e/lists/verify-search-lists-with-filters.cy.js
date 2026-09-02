import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search lists', () => {
    // user1 is the creator of List 3; user2 is the logged-in user, creator of the other
    // lists and the editor who sets "Updated by" on Lists 3 and 5.
    let user1 = {};
    let user2 = {};
    const postfix = getRandomPostfix();

    const permissions = [
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
    ];

    // List 0 ("Missing items") is a system generated list present on the environment by default.
    const cannedSystemList = 'Missing items';

    const list1 = {
      name: `Missing Items Report ${postfix}`,
      description: 'Items missing from shelves since January',
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const list2 = {
      name: `missing barcodes ${postfix}`,
      description: 'items without barcode assigned',
      recordType: 'Items',
      fqlQuery: '',
      isActive: false,
      isPrivate: true,
    };
    const list3 = {
      name: `Overdue Loans Q2 ${postfix}`,
      description: 'Loans overdue for more than 30 days',
      recordType: 'Loans',
      fqlQuery: '',
      isActive: false,
      isPrivate: false,
    };
    const list4 = {
      name: `Summer Reading List ${postfix}`,
      description: 'Items tagged for summer reading program',
      recordType: 'Items',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const list5 = {
      name: `New Users Onboarding ${postfix}`,
      description: 'Users created in the last 7 days',
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };

    // Re-save an existing list (same content) to bump its "Updated by" to the current user.
    const buildUpdateBody = (body) => ({
      name: body.name,
      description: body.description,
      entityTypeId: body.entityTypeId,
      fqlQuery: body.fqlQuery,
      fields: body.fields,
      queryId: body.queryId,
      isActive: body.isActive,
      isPrivate: body.isPrivate,
      version: body.version,
    });

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(permissions).then((props) => {
        user1 = props;
      });
      cy.createTempUser(permissions).then((props) => {
        user2 = props;
      });

      // Create lists: user1 owns List 3; user2 owns Lists 1, 2, 4, 5.
      cy.then(() => {
        // user1 creates List 3 (Created by = User 1)
        cy.getUserToken(user1.username, user1.password);
        Lists.createViaApi(list3).then((body) => {
          list3.id = body.id;
        });

        // user2 creates Lists 1, 2, 4, 5 (Created by = User 2)
        cy.getUserToken(user2.username, user2.password);
        Lists.createViaApi(list1).then((body) => {
          list1.id = body.id;
        });
        Lists.createViaApi(list2).then((body) => {
          list2.id = body.id;
        });
        Lists.createViaApi(list4).then((body) => {
          list4.id = body.id;
        });
        Lists.createViaApi(list5).then((body) => {
          list5.id = body.id;
        });
      });

      // user2 re-saves Lists 3 and 5 so their "Updated by" = User 2.
      // Separate cy.then() so the ids assigned above are resolved before they are read
      // (arguments are evaluated when the callback is built, not when queued commands run).
      cy.then(() => {
        Lists.getListByIdViaApi(list3.id).then((body) => {
          Lists.editViaApi(list3.id, buildUpdateBody(body));
        });
        Lists.getListByIdViaApi(list5.id).then((body) => {
          Lists.editViaApi(list5.id, buildUpdateBody(body));
        });
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(user2.username, user2.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getUserToken(user1.username, user1.password);
      Lists.deleteViaApi(list3.id);
      cy.getUserToken(user2.username, user2.password);
      [list1.id, list2.id, list4.id, list5.id].forEach((id) => Lists.deleteViaApi(id));
      cy.getAdminToken();
      Users.deleteViaApi(user1.userId);
      Users.deleteViaApi(user2.userId);
    });

    it(
      'C1434639 Verify search lists used simultaneously with filters (athena)',
      { tags: ['criticalPath', 'athena', 'C1434639'] },
      () => {
        // #1 Search "missing" + filter by Status: uncheck Active, check Inactive
        Lists.fillInSearchField('missing');
        Lists.pressEnterInSearchField();
        Lists.unselectActiveLists();
        Lists.selectInactiveLists();
        Lists.verifyListIsPresent(list2.name);
        Lists.verifyListsPaneRecordsCount(1);

        // #2 Search "ITEMS" + filter by Visibility: uncheck Active, check Shared
        Lists.resetAllFilters();
        Lists.fillInSearchField('ITEMS');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectSharedLists();
        Lists.verifyListIsPresent(cannedSystemList);
        Lists.verifyListIsPresent(list1.name);
        Lists.verifyListIsPresent(list4.name);
        Lists.verifyListsPaneRecordsCount(3);

        // #3 Search "Missing Items" + filter by Source: uncheck Active, check System
        Lists.resetAllFilters();
        Lists.fillInSearchField('Missing Items');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectSystemSource();
        Lists.verifyListIsPresent(cannedSystemList);
        Lists.verifyListsPaneRecordsCount(1);

        // #4 Search "day" + filter by Created by: uncheck Active, select User 1
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectCreatedByFilter(user1.username);
        Lists.verifyListIsPresent(list3.name);
        Lists.verifyListsPaneRecordsCount(1);

        // #5 Search "day" + filter by Updated by: uncheck Active, select User 2
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectUpdatedByFilter(user2.username);
        Lists.verifyListIsPresent(list3.name);
        Lists.verifyListIsPresent(list5.name);
        Lists.verifyListsPaneRecordsCount(2);

        // #6 Search "day" + filter by Record types: uncheck Active, select Loans
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectRecordTypeFilter('Loans');
        Lists.verifyListIsPresent(list3.name);
        Lists.verifyListsPaneRecordsCount(1);

        // #7 Search "day" + all filters (Active stays checked): Private, User generated,
        // Created by User 2, Updated by User 2, Record types Users
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.selectPrivateLists();
        Lists.selectUserGeneratedSource();
        Lists.selectCreatedByFilter(user2.username);
        Lists.selectUpdatedByFilter(user2.username);
        Lists.selectRecordTypeFilter('Users');
        Lists.verifyListIsPresent(list5.name);
        Lists.verifyListsPaneRecordsCount(1);

        // #8 Search "day" + filters with no matching results: Created by User 1, Record types Items
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.selectCreatedByFilter(user1.username);
        Lists.selectRecordTypeFilter('Items');
        Lists.verifyNoResultsFoundForSearchTerm('day');
        Lists.verifyListsPaneRecordsCount(0);
      },
    );
  });
});
