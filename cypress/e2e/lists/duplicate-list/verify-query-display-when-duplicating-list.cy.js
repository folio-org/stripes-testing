import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

let userData;
const listWithQuery = {
  name: `AT_C451623-DuplicateTest-${getTestEntityValue('list')}`,
  description: `C451623-${getTestEntityValue('desc')}`,
  recordType: 'Users',
  fqlQuery: '',
  isActive: true,
  isPrivate: false,
};
const listWithoutQuery = {
  name: `AT_C451623-NewList1-${getTestEntityValue('list')}`,
  description: `C451623-${getTestEntityValue('desc')}`,
  recordType: 'Users',
  fqlQuery: '',
  isActive: true,
  isPrivate: false,
};
const duplicateListWithQueryName = listWithQuery.name + ' - copy';
const duplicateListWithoutQueryName = listWithoutQuery.name + ' - copy';

describe('Lists', () => {
  describe('Duplicate list', () => {
    before('Create test data', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          // Create list with query that finds the created user by UUID (Precondition 1)
          Lists.getAllEntityTypesViaApi().then((response) => {
            const usersEntityTypeId = response.body.entityTypes.find(
              (entityType) => entityType.label === 'Users',
            ).id;
            const query = {
              entityTypeId: usersEntityTypeId,
              fqlQuery: `{"users.id":{"$eq":"${userData.userId}"}}`,
            };
            listWithQuery.uiQuery = `users.id == ${userData.userId}`;

            Lists.createQueryViaApi(query).then((createdQuery) => {
              listWithQuery.queryId = createdQuery.queryId;
              listWithQuery.fqlQuery = createdQuery.fqlQuery;
              listWithQuery.fields = ['users.id', 'user.id'];

              Lists.createViaApi(listWithQuery).then((body) => {
                listWithQuery.id = body.id;
              });
            });
          });

          // Create list without query (Precondition 2)
          Lists.createViaApi(listWithoutQuery).then((body) => {
            listWithoutQuery.id = body.id;
          });
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteViaApi(listWithQuery.id);
      Lists.deleteViaApi(listWithoutQuery.id);
      Lists.deleteListByNameViaApi(duplicateListWithQueryName, true);
      Lists.deleteListByNameViaApi(duplicateListWithoutQueryName, true);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C451623 Verify that displays query when duplicating a list with and without a query (athena)',
      { tags: ['criticalPath', 'athena', 'C451623'] },
      () => {
        // Step 1: Navigate to the "Lists" landing page and select the active list (from Precondition1)
        Lists.verifyListIsPresent(listWithQuery.name);
        Lists.openList(listWithQuery.name);

        // Step 2: Click on "Actions" dropdown and select "Duplicate list"
        Lists.openActions();
        Lists.duplicateList();

        // Verify the "Duplicate List: <list name>" page is opened with prepopulated fields
        Lists.verifyListName(duplicateListWithQueryName);
        Lists.verifyListDescription(listWithQuery.description);
        Lists.verifyRecordType(listWithQuery.recordType);
        Lists.verifyVisibility('Shared', true);
        Lists.verifyVisibility('Private', false);
        Lists.verifyStatus('Active', true);
        Lists.verifyStatus('Inactive', false);

        // Step 3: Check the "Query: <Friendly query>" section
        Lists.verifyQuery(listWithQuery.uiQuery);
        Lists.verifySingleRecordNumber(false);
        Lists.verifyResultCellByIdentifier(userData.userId, 'User — User UUID', userData.userId);
        Lists.closeListDetailsPane();
        Lists.closeListDetailsPane();
        Lists.waitLoading();

        // Step 4: Navigate to the "Lists" landing page and select the active list (from Precondition2)
        Lists.verifyListIsPresent(listWithoutQuery.name);
        Lists.openList(listWithoutQuery.name);

        // Step 5: Click on "Actions" dropdown and select "Duplicate list"
        Lists.openActions();
        Lists.duplicateList();

        // Verify the "Duplicate List: <list name>" page is opened with prepopulated fields
        Lists.verifyListName(duplicateListWithoutQueryName);
        Lists.verifyListDescription(listWithoutQuery.description);
        Lists.verifyRecordType(listWithoutQuery.recordType);
        Lists.verifyVisibility('Shared', true);
        Lists.verifyVisibility('Private', false);
        Lists.verifyStatus('Active', true);
        Lists.verifyStatus('Inactive', false);

        // Step 6: Check the "Query: " section
        // Verify the "Query: " is displayed (empty)
        Lists.getQueryText().then((queryText) => {
          expect(queryText).to.be.eq('Query: ');
        });
        Lists.verifyRecordsNumber('No', false);
      },
    );
  });
});
