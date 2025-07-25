import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
    readingRoomName: `Autotest_Reading_Room${getRandomPostfix()}`,
    isPublic: true,
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then((servicePoint) => {
        testData.servicePointId = servicePoint.body.id;

        SettingsReadingRoom.createReadingRoomViaApi(
          testData.servicePointId,
          testData.servicePoint.name,
          testData.readingRoomId,
          testData.isPublic,
          testData.readingRoomName,
        );
      });
    });

    // create patron user with access to reading room
    cy.createTempUser([]).then((userProperties) => {
      testData.patronUser = userProperties;

      ReadingRoom.allowAccessForUser(
        testData.readingRoomId,
        testData.readingRoomName,
        testData.servicePointId,
        testData.patronUser.userId,
      );
    });

    // create first user
    cy.createTempUser([]).then((userProperties) => {
      testData.firstUser = userProperties;
    });

    // create second user
    cy.createTempUser([]).then((userProperties) => {
      testData.secondUser = userProperties;
    });

    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
    UsersSearchPane.searchByUsername(Cypress.env('diku_login'));
    UserEdit.openEdit();
    UserEdit.changePreferredContact();
    UserEdit.openServicePointsAccordion();
    UserEdit.addServicePoints(testData.servicePoint.name);
    UserEdit.saveAndClose();
    SwitchServicePoint.switchServicePoint(testData.servicePoint.name);
    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.READING_ROOM_ACCESS);
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    ServicePoints.deleteViaApi(testData.servicePointId);
    Users.deleteViaApi(testData.patronUser.userId);
    Users.deleteViaApi(testData.firstUser.userId);
    Users.deleteViaApi(testData.secondUser.userId);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
  });

  it(
    'C494350 Validate Functionality of scanning another patron and cancel button on Reading room access app (volaris)',
    { tags: ['criticalPath', 'volaris', 'C494350'] },
    () => {
      const firstUserInfo = {
        preferredFirstName: testData.firstUser.preferredFirstName,
        lastName: testData.firstUser.lastName,
        patronGroup: testData.firstUser.userGroup.group,
        userType: 'staff',
        barcode: testData.firstUser.barcode,
        expirationDate: 'No value set-',
      };
      const secondUserInfo = {
        preferredFirstName: testData.secondUser.preferredFirstName,
        lastName: testData.secondUser.lastName,
        patronGroup: testData.secondUser.userGroup.group,
        userType: 'staff',
        barcode: testData.secondUser.barcode,
        expirationDate: 'No value set-',
      };

      ReadingRoom.getReadingRoomViaApi({
        query: `readingRoomName="${testData.readingRoomName}"`,
      }).then((resp) => {
        const totalRecordsBefore = resp.body.accessLogs.length;

        ReadingRoom.scanUser(testData.firstUser.barcode);
        ReadingRoom.verifyUserIsScanned(testData.firstUser.preferredFirstName);
        ReadingRoom.verifyUserInformation(firstUserInfo);
        ReadingRoom.verifyButtonsEnabled();
        ReadingRoom.scanUser(testData.secondUser.barcode);
        ReadingRoom.verifyUserIsScanned(testData.secondUser.preferredFirstName);
        ReadingRoom.verifyUserInformation(secondUserInfo);
        ReadingRoom.verifyButtonsEnabled();
        ReadingRoom.clickCancelButton();
        ReadingRoom.verifyInformationAfterAction();
        ReadingRoom.getReadingRoomViaApi({
          query: `readingRoomName="${testData.readingRoomName}"`,
        }).then((response) => {
          const totalRecordsAfter = response.body.accessLogs.length;

          cy.expect(totalRecordsAfter).to.eq(totalRecordsBefore);
        });
      });
    },
  );
});
