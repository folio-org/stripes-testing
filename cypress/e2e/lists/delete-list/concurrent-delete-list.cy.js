import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Delete list', () => {
    let userData = {};
    const listData = {
      name: `C411773-${getTestEntityValue('list')}`,
      description: `C411773-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    beforeEach('Create a list', () => {
      cy.getAdminToken().then(() => {
        Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
          Lists.createQueryViaApi(query).then((createdQuery) => {
            listData.queryId = createdQuery.queryId;
            listData.fqlQuery = createdQuery.fqlQuery;
            listData.fields = fields;

            Lists.createViaApi(listData).then((body) => {
              listData.version = body.version;
              listId = body.id;
            }).then(() => {
              Lists.waitForListToCompleteRefreshViaApi(listId);
            });
          });
        });
      });



      // Lists.getListByIdViaApi(listId).then((body) => {
      //   listData.version = body.version;
      // }).then(() => {
      //   Lists.waitForListToCompleteRefreshViaApi(listId).then(() => {
      //     Lists.editViaApi(listId, { ...listData, isActive: true, isPrivate: false }).then(() => {
      //       Lists.getListByIdViaApi(listId).then((body) => {
      //         listData.version = body.version;
      //       }).then(() => {
      //         Lists.waitForListToCompleteRefreshViaApi(listId);
      //       });
      //     });
      //   });
      // });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listId);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it.only('C411773 (Multiple users): Delete list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411773'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        // delete a list
        Lists.deleteViaApi(listId).then(() => { cy.wait(1000); });
        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifyCalloutMessage(`Error: ${listData.name} was not deleted because the list was not found. Verify the list location and try again.`);
      });

    it('C411741 (Multiple users): Make the list Private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411741'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isPrivate: true }).then(() => { cy.wait(3000); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(1000);
        });

        Lists.setDescription('test description');
        Lists.saveList();
        Lists.verifyCalloutMessage(`Error: changes to ${listData.name} were not saved. Someone else modified this list and you no longer have access to it.`);
      });

    it('C411766 (Multiple users) Edit list when refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'С411766'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then(() => { cy.wait(500); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.setDescription('test description');
        Lists.saveList();
        Lists.verifyCalloutMessage(`Error: changes to ${listData.name} were not saved. Lists can't be updated while a refresh is in progress.`);
      });

    it('C411765 (Multiple users) Edit deleted list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411765'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        const modifiedName = '_test_name';
        Lists.setName(`${listData.name}${modifiedName}`);

        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then(() => { cy.wait(500); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.saveList();
        Lists.verifyCalloutMessage(`Error: ${listData.name}${modifiedName} was not found. Verify the list location and try again.`);
      });
  });
});
