import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    readingRoomId: uuid(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint)
      .then((servicePoint) => {
        testData.servicePoint.id = servicePoint.body.id;
      })
      .then(() => SettingsReadingRoom.createReadingRoomViaApi(
        testData.servicePoint.id,
        testData.servicePoint.name,
        testData.readingRoomId,
        false,
      ));

    cy.createTempUser([]).then((userProperties) => {
      testData.userWithoutPermissions = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userProperties.userId,
        testData.servicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiUserCanAssignUnassignPermissions.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      },
    );
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.userWithoutPermissions.userId);
  });

  it(
    'C466238 User can create edit and remove reading room access permission (volaris)',
    { tags: ['smokeBroken', 'volaris', 'C466238'] },
    () => {
      UsersSearchPane.searchByUsername(testData.userWithoutPermissions.username);
      UsersSearchPane.waitLoading();
      UserEdit.addPermissions([Permissions.uiSettingsTenantReadingRoomAll.gui]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([Permissions.uiSettingsTenantReadingRoomAll.gui]);
    },
  );
});
