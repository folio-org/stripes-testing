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
  const readingRoomId = uuid();
  const allowedButtonState = false;
  const userAllowedInReadingRoom = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const userNotAllowedInReadingRoom = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(userAllowedInReadingRoom.servicePoint)
        .then((servicePoint) => {
          userAllowedInReadingRoom.servicePoint.id = servicePoint.body.id;
        })
        .then(() => SettingsReadingRoom.createReadingRoomViaApi(
          userAllowedInReadingRoom.servicePoint.id,
          readingRoomId,
          false,
        ));
      ServicePoints.createViaApi(userNotAllowedInReadingRoom.servicePoint).then((servicePoint) => {
        userNotAllowedInReadingRoom.servicePoint.id = servicePoint.body.id;
      });
    });

    cy.createTempUser().then((userProperties) => {
      userNotAllowedInReadingRoom.user = userProperties;

      UserEdit.addServicePointViaApi(
        userNotAllowedInReadingRoom.servicePoint.id,
        userNotAllowedInReadingRoom.user.userId,
        userNotAllowedInReadingRoom.servicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiReadingRoomAll.gui]).then((userProperties) => {
      userAllowedInReadingRoom.user = userProperties;

      UserEdit.addServicePointViaApi(
        userAllowedInReadingRoom.servicePoint.id,
        userAllowedInReadingRoom.user.userId,
        userAllowedInReadingRoom.servicePoint.id,
      );

      cy.login(userAllowedInReadingRoom.user.username, userAllowedInReadingRoom.user.password);
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userNotAllowedInReadingRoom.user.userId);
    Users.deleteViaApi(userAllowedInReadingRoom.user.userId);
    ServicePoints.deleteViaApi(userNotAllowedInReadingRoom.servicePoint.id);
    ServicePoints.deleteViaApi(userAllowedInReadingRoom.servicePoint.id);
    SettingsReadingRoom.deleteReadingRoomViaApi(readingRoomId);
  });

  it(
    'C494088 Validate Functionality of scan patron card page with not allowed user (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {
      const userInfo = {
        firstName: userNotAllowedInReadingRoom.user.firstName,
        lastName: userNotAllowedInReadingRoom.user.lastName,
        patronGroup: userNotAllowedInReadingRoom.user.userGroup.group,
        userType: userNotAllowedInReadingRoom.user.userGroup.group,
        barcode: userNotAllowedInReadingRoom.user.barcode,
        expirationDate: 'No value set-',
      };

      cy.visit(TopMenu.readingRoom);
      ReadingRoom.waitLoading();
      ReadingRoom.scanUser(userNotAllowedInReadingRoom.user.barcode);
      ReadingRoom.verifyUserIsScanned(userInfo.firstName);
      ReadingRoom.verifyUserInformation(userInfo, false);
      ReadingRoom.verifyWarningMessage('Not allowed');
      ReadingRoom.verifyButtonsEnabled(allowedButtonState);
      ReadingRoom.clickNotAllowedButton();
      InteractorsTools.checkCalloutMessage('Action was successfully saved');
      ReadingRoom.verifyInformationAfterAction();
    },
  );
});
