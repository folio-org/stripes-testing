import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Permissions', () => {
    const { user, memberTenant } = parseSanityParameters();
    const listData = {
      name: `C411693-${getTestEntityValue('list')}`,
      description: `C411693-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      cy.wrap(true)
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
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      Lists.deleteViaApi(listData.id);
    });

    it(
      'C411694 C411693 Lists (Admin): All permissions (corsair)',
      { tags: ['dryRun', 'corsair', 'C411694', 'C411693'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();
        Lists.verifyNewButtonIsEnabled();
        Lists.verifyListIsPresent(listData.name);
        Lists.selectActiveLists();
        Lists.selectInactiveLists();
        Lists.selectPrivateLists();
        Lists.selectSharedLists();
        Lists.selectRecordTypeFilter(listData.recordType);
        Lists.resetAllFilters();

        Lists.openList(listData.name);
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListButtonIsActive();

        Lists.editList();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsActive();
      },
    );
  });
});
