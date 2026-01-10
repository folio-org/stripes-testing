import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const userData = {};
    const listData = {
      name: `C423603-${getTestEntityValue('list')}`,
      description: `C423603-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const duplicateListData = {
      name: `C423603-${getTestEntityValue('list')}`,
      description: `C423603-${getTestEntityValue('desc')}`,
      status: 'Active',
      visibility: 'Private',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          duplicateListData.source = `${userData.username}, ${userProperties.firstName}`;
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
      'C423603 C423601 Duplicate list is saved with edits (corsair)',
      { tags: ['criticalPath', 'corsair', 'C423603', 'C423601'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.duplicateList();

        Lists.setName(duplicateListData.name);
        Lists.setDescription(duplicateListData.description);
        Lists.selectVisibility(duplicateListData.visibility);

        Lists.editQuery();
        Lists.changeQueryBoolValue(false);
        Lists.testQuery();
        Lists.runQueryAndSave();
        // workaround
        Lists.closeWithoutSaving();

        Lists.verifySuccessCalloutMessage(`List ${duplicateListData.name} saved.`);
        Lists.waitForCompilingToComplete();

        Lists.verifyQuery('users.active == False');

        Lists.closeListDetailsPane();
        Lists.verifyListIsPresent(listData.name);
        Lists.verifyListIsPresent(duplicateListData.name);

        Lists.findResultRowIndexByContent(duplicateListData.name).then((rowIndex) => {
          Lists.checkResultSearch(duplicateListData, rowIndex);
        });
      },
    );
  });
});
