import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    user: {},
    servicePoints: [],
  };

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.getCircDesk1ServicePointViaApi().then((circDesk1) => {
      testData.servicePoints.push(circDesk1);

      ServicePoints.getCircDesk2ServicePointViaApi().then((circDesk2) => {
        testData.servicePoints.push(circDesk2);

        ServicePoints.getOnlineServicePointViaApi().then((online) => {
          testData.servicePoints.push(online);

          cy.createTempUser([
            Permissions.uiUserEdit.gui,
            Permissions.uiUsersEdituserservicepoints.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            UserEdit.addServicePointsViaApi(
              [circDesk1.id, circDesk2.id, online.id],
              userProperties.userId,
              circDesk1.id,
            );

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C400650 Verify that user can remove all service points from a user (extended, volaris)',
    { tags: ['extendedPath', 'volaris', 'C400650'] },
    () => {
      // Step 1-2: Search for user from preconditions / Select "Actions" >> Select "Edit"
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.waitLoading();
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();

      // Step 3: Expand "Service points" accordion >> Remove all service points assigned to the user
      UserEdit.openServicePointsAccordion();
      UserEdit.removeAllServicePoints();

      // Step 4: Click on "Save & close" / Verify "Service points" accordion contains only text "No service points found"
      UserEdit.saveAndClose();
      UsersCard.openServicePointsAccordion();
      UsersCard.verifyNoServicePointsFound();
    },
  );
});
