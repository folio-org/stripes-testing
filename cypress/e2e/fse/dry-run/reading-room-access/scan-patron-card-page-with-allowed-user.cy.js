import uuid from 'uuid';
import ReadingRoom from '../../../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Reading Room Access', () => {
  const { user, memberTenant } = parseSanityParameters();
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
  };

  before('Create test data and login', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false }).then(() => {
      ServicePoints.createViaApi(testData.servicePoint)
        .then((servicePoint) => {
          testData.servicePointId = servicePoint.body.id;
        })
        .then(() => SettingsReadingRoom.createReadingRoomViaApi(
          testData.servicePointId,
          testData.servicePoint.name,
          testData.readingRoomId,
        ));
    });

    cy.createTempUser([], 'staff', 'staff', uuid(), true).then((userProperties) => {
      testData.secondUser = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.secondUser.userId,
        testData.servicePointId,
      );

      cy.login(user.username, user.password, {
        path: TopMenu.readingRoom,
        waiter: ReadingRoom.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getUserToken(user.username, user.password, { log: false });
    Users.deleteViaApi(testData.secondUser.userId);
    UserEdit.changeServicePointPreferenceViaApi(testData.firstUser.userId, [
      testData.servicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(testData.secondUser.userId, [
      testData.servicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
  });

  it(
    'C494054 Validate Functionality of Scan Patron Card page with allowed user (volaris)',
    { tags: ['dryRun', 'volaris', 'C494054'] },
    () => {
      const userInfo = {
        preferredFirstName: testData.secondUser.preferredFirstName,
        lastName: testData.secondUser.lastName,
        patronGroup: testData.secondUser.userGroup.group,
        userType: testData.secondUser.userGroup.group,
        barcode: testData.secondUser.barcode,
        expirationDate: 'No value set-',
      };

      ReadingRoom.scanUser(testData.secondUser.barcode);
      ReadingRoom.verifyUserIsScanned(userInfo.preferredFirstName);
      ReadingRoom.verifyUserInformation(userInfo);
      ReadingRoom.verifyButtonsEnabled();
      ReadingRoom.clickAllowedButton();
      InteractorsTools.checkCalloutMessage(
        `Permitted entry to ${SettingsReadingRoom.readingRoomName}`,
      );
      ReadingRoom.verifyInformationAfterAction();
    },
  );
});
