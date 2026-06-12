import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then((servicePoint) => {
        testData.servicePointId = servicePoint.body.id;

        SettingsReadingRoom.createReadingRoomViaApi(
          testData.servicePointId,
          testData.servicePoint.name,
          testData.readingRoomId,
          true,
        );
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.inactiveUser = userProperties;

      cy.getUsers({ limit: 1, query: `"id"="${testData.inactiveUser.userId}"` }).then((users) => {
        const user = users[0];
        user.active = false;
        cy.updateUser(user);
      });

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.inactiveUser.userId,
        testData.servicePointId,
      );
    });

    cy.createTempUser([Permissions.uiReadingRoomAll.gui]).then((userProperties) => {
      testData.staffUser = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.staffUser.userId,
        testData.servicePointId,
      );

      cy.login(testData.staffUser.username, testData.staffUser.password, {
        path: TopMenu.readingRoom,
        waiter: ReadingRoom.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.inactiveUser.userId, [
      testData.servicePointId,
    ]);
    Users.deleteViaApi(testData.inactiveUser.userId);
    UserEdit.changeServicePointPreferenceViaApi(testData.staffUser.userId, [
      testData.servicePointId,
    ]);
    Users.deleteViaApi(testData.staffUser.userId);
    ServicePoints.deleteViaApi(testData.servicePointId);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
  });

  it(
    'C494062 No actions are available in Reading room access app if scanned barcode belongs to inactive user (volaris)',
    { tags: ['extendedPath', 'volaris', 'C494062'] },
    () => {
      const userInfo = {
        preferredFirstName: testData.inactiveUser.preferredFirstName,
        lastName: testData.inactiveUser.lastName,
        patronGroup: testData.inactiveUser.userGroup.group,
        userType: 'staff',
        barcode: testData.inactiveUser.barcode,
        expirationDate: 'No value set-',
      };

      // Step 1: Paste the barcode of inactive user into the barcode field -> click "Enter" button
      ReadingRoom.scanUser(testData.inactiveUser.barcode);
      ReadingRoom.verifyUserInformation(userInfo);
      ReadingRoom.verifyInactiveUserWarning();
      ReadingRoom.verifyActionButtonsHidden();
    },
  );
});
