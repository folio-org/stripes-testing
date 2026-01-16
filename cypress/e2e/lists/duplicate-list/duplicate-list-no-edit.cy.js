import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const userData = {};
    const listData = {
      name: `C423602-${getTestEntityValue('list')}`,
      description: `C423602-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const duplicateListData = {
      name: listData.name + ' - copy',
      recordType: listData.recordType,
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          duplicateListData.source = `${userProperties.username}, ${userProperties.firstName}`;
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
      'C423602 Duplicate list is saved with no edits (corsair)',
      { tags: ['criticalPath', 'corsair', 'C423602'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.duplicateList();

        Lists.verifyListName(duplicateListData.name);
        Lists.verifyListDescription(listData.description);
        Lists.verifyRecordType(listData.recordType);
        Lists.verifyVisibility('Shared', true);
        Lists.verifyVisibility('Private', false);
        Lists.verifyStatus('Active', true);
        Lists.verifyVisibility('Inactive', false);

        Lists.editQuery();
        Lists.verifyEditorContainsQuery({
          field: 'User — Active',
          operator: 'equals',
          value: 'True',
        });
        Lists.cancelQueryBuilder();

        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${duplicateListData.name} saved.`);

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
