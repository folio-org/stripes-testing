import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';

function addPatronBlock(description, user) {
  return cy.createBlockApi({
    desc: description,
    borrowing: true,
    renewals: false,
    requests: false,
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
      title: 'Patron blocked from borrowing',
      description1: 'manual patron block for Borrowing 1',
      description2: 'manual patron block for Borrowing 2',
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
      'C478 Verify that manual patron block for "Borrowing" blocks checkouts by patron (vega)',
      { tags: ['extendedPath', 'vega', 'C478'] },
      () => {
        cy.login(userData.user1.username, userData.user1.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
          authRefresh: true,
        });

        CheckOutActions.checkOutUser(userData.user1.barcode);
        Checkout.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        Checkout.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description1);

        cy.login(userData.user2.username, userData.user2.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
          authRefresh: true,
        });

        CheckOutActions.checkOutUser(userData.user2.barcode);
        Checkout.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        Checkout.verifyModal(renewalsBlock.title, renewalsBlock.description2);
        Checkout.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description2);
        UsersCard.verifyPatronBlockDescription(2, renewalsBlock.description1);

        cy.login(userData.user3.username, userData.user3.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
          authRefresh: true,
        });

        CheckOutActions.checkOutUser(userData.user3.barcode);
        Checkout.verifyModalAbsent(renewalsBlock.title);
      },
    );
  });
});
