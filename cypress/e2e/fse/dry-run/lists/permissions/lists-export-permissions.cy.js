import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe(
    'Permissions', () => {
      const { user, memberTenant } = parseSanityParameters();
      let listData;

      beforeEach('Create test data', () => {
        listData = {
          name: `C418652-${getTestEntityValue('list')}`,
          description: `C418652-${getTestEntityValue('desc')}`,
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: false,
        };
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
                }).then(() => {
                  Lists.waitForListToCompleteRefreshViaApi(listData.id);
                });
              });
            });
          });
      });

      afterEach('Delete test data', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password);
        cy.allure().logCommandSteps();
        Lists.deleteViaApi(listData.id);
        Lists.deleteDownloadedFile(listData.name);
      });

      it(
        'C418652 Lists (Export): Can create, edit, refresh, and export lists (corsair)',
        { tags: ['dryRun', 'corsair', 'C418652'] },
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
          Lists.verifyExportListButtonIsActive();
          Lists.verifyExportListVisibleColumnsButtonIsActive();
          // Lists.verifyDeleteListButtonDoesNotExist();
          Lists.refreshList();
          Lists.waitForCompilingToComplete();
          Lists.openActions();
          Lists.exportList();
          Lists.verifyCalloutMessage(
            `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
          );
          Lists.verifyCalloutMessage(`List ${listData.name} was successfully exported to CSV.`);
          cy.wait(5000);
          Lists.openActions();
          Lists.editList();
        },
      );
    },
  );
});
