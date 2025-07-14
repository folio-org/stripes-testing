import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Export concurrent list', () => {
    let userData = {};
    const listData = {
      name: `C411767-${getTestEntityValue('list')}`,
      description: `C411767-${getTestEntityValue('desc')}`,
      recordType: 'Instances',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    beforeEach('Create user and list', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          Lists.buildQueryOnAllInstances().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listData.queryId = createdQuery.queryId;
              listData.fqlQuery = createdQuery.fqlQuery;
              listData.fields = fields;

              Lists.createViaApi(listData)
                .then((body) => {
                  listData.version = body.version;
                  listId = body.id;
                })
                .then(() => {
                  Lists.waitForListToCompleteRefreshViaApi(listId);
                });
            });
          });
        });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteRecursivelyViaApi(listId);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411767 (Multiple users) Edit list when export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'С411767'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, description: 'new description' }).then(
          (response) => {
            expect(response.body).to.have.property(
              'message',
              `List ( with id ${listId} ) is currently being exported`,
            );
            expect(response.body).to.have.property('code', 'update-export.in.progress');
          },
        );
      },
    );

    it(
      'C411775 (Multiple users): Delete list when export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411775'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );

        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then((response) => {
          expect(response.body).to.have.property(
            'message',
            `List ( with id ${listId} ) is currently being exported`,
          );
          expect(response.body).to.have.property('code', 'delete-export.in.progress');
        });
      },
    );

    it(
      'C411828 (Multiple users): Refresh list when someone export the list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411828'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );

        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then((response) => {
          expect(response.body).to.have.property(
            'message',
            `List ( with id ${listId} ) is currently being exported`,
          );
          expect(response.body).to.have.property('code', 'refresh-export.in.progress');
        });
      },
    );
  });
});
