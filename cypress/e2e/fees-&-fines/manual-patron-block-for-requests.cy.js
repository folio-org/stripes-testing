import { Permissions } from '../../support/dictionary';
import NewRequest from '../../support/fragments/requests/newRequest';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

function addPatronBlock(description, user) {
  return cy.createBlockApi({
    desc: description,
    borrowing: false,
    renewals: false,
    requests: true,
    type: 'Manual',
    userId: user.userId,
  });
}

describe('Fees&Fines', () => {
  describe('Manual Patron Blocks', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const userData = {};

    const renewalsBlock = {
      title: 'Patron blocked from requesting',
      description1: 'manual patron block for Requests 1',
      description2: 'manual patron block for Requests 2',
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
      });

      // user 1
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiRequestsAll.gui,
      ])
        .then((userProperties) => {
          userData.user1 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user1.userId);
          addPatronBlock(renewalsBlock.description1, userData.user1).then((body) => {
            renewalsBlock.id11 = body.id;
          });
        });

      // user 2
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiRequestsAll.gui,
      ])
        .then((userProperties) => {
          userData.user2 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user2.userId);
          addPatronBlock(renewalsBlock.description1, userData.user2).then((body) => {
            renewalsBlock.id21 = body.id;
          });
          addPatronBlock(renewalsBlock.description2, userData.user2).then((body) => {
            renewalsBlock.id22 = body.id;
          });
        });

      // user 3
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiRequestsAll.gui,
      ])
        .then((userProperties) => {
          userData.user3 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user3.userId);
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.user1.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(userData.user2.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(userData.user3.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      cy.deleteBlockApi(renewalsBlock.id11);
      cy.deleteBlockApi(renewalsBlock.id21);
      cy.deleteBlockApi(renewalsBlock.id22);
      Users.deleteViaApi(userData.user1.userId);
      Users.deleteViaApi(userData.user2.userId);
      Users.deleteViaApi(userData.user3.userId);
    });

    it(
      'C481 Verify that manual patron block for "Requests" blocks requests by patron (vega)',
      { tags: ['extendedPath', 'vega', 'C481'] },
      () => {
        cy.login(userData.user1.username, userData.user1.password,
          { path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(userData.user1.username);
        UsersCard.expandRequestSection();
        UsersCard.createNewRequest();
        NewRequest.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        NewRequest.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description1);

        cy.login(userData.user2.username, userData.user2.password,
          { path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(userData.user2.username);
        UsersCard.expandRequestSection();
        UsersCard.createNewRequest();
        NewRequest.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        NewRequest.verifyModal(renewalsBlock.title, renewalsBlock.description2);
        NewRequest.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description2);
        UsersCard.verifyPatronBlockDescription(2, renewalsBlock.description1);

        cy.login(userData.user3.username, userData.user3.password,
          { path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(userData.user3.username);
        UsersCard.expandRequestSection();
        UsersCard.createNewRequest();
        NewRequest.verifyModalAbsent(renewalsBlock.title);
      },
    );
  });
});
