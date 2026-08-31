import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

let userData;
const listData = {
  name: `AT_C784465-${getTestEntityValue('list')}`,
  description: `C784465-${getTestEntityValue('desc')}`,
  recordType: 'Users',
  fqlQuery: '',
  isActive: true,
  isPrivate: false,
};
const duplicateListData = {
  name: `AT_C784465-${getTestEntityValue('list')}`,
  description: `C784465-${getTestEntityValue('desc')}`,
  status: 'Active',
  visibility: 'Private',
};

describe('Lists', () => {
  describe('Duplicate list', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui])
        .then((userProperties) => {
          userData = userProperties;
          duplicateListData.source = `${userData.username}, ${userData.firstName}`;
        })
        .then(() => {
          Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listData.queryId = createdQuery.queryId;
              listData.fqlQuery = createdQuery.fqlQuery;
              listData.fields = fields;

              Lists.createViaApi(listData).then((body) => {
                listData.id = body.id;
              });
            });
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
      Lists.deleteViaApi(listData.id);
      Lists.deleteListByNameViaApi(duplicateListData.name, true);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C784465 The user is redirected to the Lists detail page and gets a successful save toast notification when editing the query during duplication (athena)',
      { tags: ['extendedPath', 'athena', 'C784465'] },
      () => {
        // Step 1: Open the list from the pre-condition
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        // Step 2: Click on "Actions" => "Duplicate lists", update list name, click "Edit query"
        Lists.openActions();
        Lists.duplicateList();
        Lists.setName(duplicateListData.name);
        Lists.setDescription(duplicateListData.description);
        Lists.selectVisibility(duplicateListData.visibility);
        Lists.editQuery();

        // Step 3: Update the existing query, click on "Test query", click on "Run query & save"
        Lists.changeQueryBoolValue(false);
        Lists.testQuery();
        Lists.runQueryAndSave();

        Lists.verifyListSavedCalloutMessage(duplicateListData.name);
        Lists.verifyCancellationModalAbsent();
        Lists.verifyListNameLabel(duplicateListData.name);
        Lists.waitForCompilingToComplete();
        Lists.verifyVisibilityLabel('Private');
      },
    );
  });
});
