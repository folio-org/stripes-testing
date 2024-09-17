import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
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

    cy.createTempUser([Permissions.uiReadingRoomAll.gui]).then((userProperties) => {
      testData.firstUser = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.firstUser.userId,
        testData.servicePointId,
      );
    });

    cy.createTempUser([], 'staff', 'staff', uuid(), true).then((userProperties) => {
      testData.secondUser = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.secondUser.userId,
        testData.servicePointId,
      );

      cy.login(testData.firstUser.username, testData.firstUser.password);
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.firstUser.userId);
    Users.deleteViaApi(testData.secondUser.userId);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
  });

  it(
    'C494054 Validate Functionality of Scan Patron Card page with allowed user (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {
      const userInfo = {
        preferredFirstName: testData.secondUser.preferredFirstName,
        lastName: testData.secondUser.lastName,
        patronGroup: testData.secondUser.userGroup.group,
        userType: testData.secondUser.userGroup.group,
        barcode: testData.secondUser.barcode,
        expirationDate: 'No value set-',
      };

      cy.visit(TopMenu.readingRoom);
      ReadingRoom.waitLoading();
      ReadingRoom.scanUser(testData.secondUser.barcode);
      ReadingRoom.verifyUserIsScanned(userInfo.preferredFirstName);
      ReadingRoom.verifyUserInformation(userInfo);
      ReadingRoom.verifyButtonsEnabled();
      ReadingRoom.clickAllowedButton();
      InteractorsTools.checkCalloutMessage(
        `Permitted entry to ${SettingsReadingRoom.readingRoomName}.`,
      );
      ReadingRoom.verifyInformationAfterAction();
    },
  );
});
