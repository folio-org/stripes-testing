import { APPLICATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Permissions', () => {
  describe('Permissions', () => {
    describe('Users', () => {
      let userData;
      let servicePointId;

      before('Preconditions', () => {
        cy.getAdminToken().then(() => {
          ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
            (servicePoints) => {
              servicePointId = servicePoints[0].id;
            },
          );
          cy.createTempUser([
            permissions.uiUserLostItemRequiringActualCost.gui,
            permissions.uiUserCanAssignUnassignPermissions.gui,
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
        { tags: ['extendedPath', 'vega', 'C359587'] },
        () => {
          UsersSearchPane.openLostItemsRequiringActualCostPane();
          LostItemsRequiringActualCostPage.waitLoading();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByUsername(userData.username);
          UsersSearchPane.waitLoading();
          UserEdit.addPermissions([permissions.uiUserLostItemRequiringActualCost.gui]);
          UserEdit.saveAndClose();
          UsersCard.verifyPermissionsNotExist([permissions.uiUserLostItemRequiringActualCost.gui]);

          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });

          UsersSearchPane.verifyLostItemsRequiringActualCostOptionNotDisplayed();
          cy.visit(TopMenu.lostItemsRequiringActualCost);
          LostItemsRequiringActualCostPage.verifyUserNotHavePermissionToAccess();
        },
      );
    });
  });
});
