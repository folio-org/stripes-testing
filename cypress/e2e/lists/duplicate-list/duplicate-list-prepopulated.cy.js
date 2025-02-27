import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const userData = {};
    const listData = {
      name: `C423599-${getTestEntityValue('list')}`,
      description: `C423599-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
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
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C423599 C423598 Duplicate action takes you to new list screen with some fields pre populated (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C423599', 'C423598'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.duplicateList();

        Lists.verifyListName(listData.name + ' - copy');
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
      },
    );
  });
});
