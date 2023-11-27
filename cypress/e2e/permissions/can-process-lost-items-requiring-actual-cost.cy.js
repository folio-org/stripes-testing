import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';

describe('Permissions', () => {
  let userData;
  let servicePointId;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      cy.createTempUser([
        permissions.uiUserLostItemRequiringActualCost.gui,
        permissions.uiUsersPermissions.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C359587 Test permission: Users: Can process lost items requiring actual cost (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, devTeams.vega] },
    () => {
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      LostItemsRequiringActualCostPage.waitLoading();

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.waitLoading();
      UserEdit.addPermissions([permissions.uiUserLostItemRequiringActualCost.gui]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissionsNotExist([permissions.uiUserLostItemRequiringActualCost.gui]);

      cy.logout();
      cy.login(userData.username, userData.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.verifyLostItemsRequiringActualCostOptionNotDisplayed();
      cy.visit(TopMenu.lostItemsRequiringActualCost);
      LostItemsRequiringActualCostPage.verifyUserNotHavePermmissionToAccess();
    },
  );
});
