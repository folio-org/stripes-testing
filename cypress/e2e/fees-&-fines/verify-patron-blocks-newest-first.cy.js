import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

function addPatronBlock(description, user) {
  return cy.createBlockApi({
    desc: description,
    borrowing: true,
    renewals: true,
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
    const blockIds = {};
    const blockDescriptions = {
      firstBlock: 'Manual block created first',
      secondBlock: 'Manual block created second',
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
      });

      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
      ])
        .then((userProperties) => {
          userData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user.userId);
          addPatronBlock(blockDescriptions.firstBlock, userData.user).then((body) => {
            blockIds.id1 = body.id;
          });
          cy.wait(2000);
          addPatronBlock(blockDescriptions.secondBlock, userData.user).then((body) => {
            blockIds.id2 = body.id;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      cy.deleteBlockApi(blockIds.id1);
      cy.deleteBlockApi(blockIds.id2);
      Users.deleteViaApi(userData.user.userId);
    });

    it(
      'C5555 Verify that "User Information" displays newest manual patron block first when more than one exists (vega)',
      { tags: ['extendedPath', 'vega', 'C5555'] },
      () => {
        cy.login(userData.user.username, userData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.searchByKeywords(userData.user.barcode);
        UsersCard.waitLoading();
        UsersCard.openPatronBlocks();
        UsersCard.verifyPatronBlockDescription(1, blockDescriptions.secondBlock);
        UsersCard.verifyPatronBlockDescription(2, blockDescriptions.firstBlock);
      },
    );
  });
});
