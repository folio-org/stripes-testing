import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Permissions', () => {
    const { user, memberTenant } = parseSanityParameters();
    const listData = {
      name: `C418649-${getTestEntityValue('list')}`,
      description: `C418649-${getTestEntityValue('desc')}`,
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
      'C418649 Lists (Delete): Can create, edit, refresh, and delete lists (corsair)',
      { tags: ['dryRun', 'corsair', 'C418649'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        // Lists.verifyExportListButtonDoesNotExist();
        Lists.refreshList();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.deleteList();
        Lists.cancelDelete();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsActive();
        // Lists.verifyExportListButtonDoesNotExist();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} deleted.`);
        Lists.verifyListIsNotPresent(listData.name);
      },
    );
  });
});
