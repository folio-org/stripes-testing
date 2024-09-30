import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TenantPane from '../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Reading Room Access', () => {
  const testData = {
    firstReadingRoomId: uuid(),
    firstReadingRoomName: `Autotest_Reading_Room${getRandomPostfix()}`,
    secondReadingRoomId: uuid(),
    thirdReadingRoomId: uuid(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then((servicePoint) => {
      testData.firstServicePoint = servicePoint.body;

      SettingsReadingRoom.createReadingRoomViaApi(
        testData.firstServicePoint.id,
        testData.firstServicePoint.name,
        testData.firstReadingRoomId,
        false,
        testData.firstReadingRoomName,
      );
    });
    ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then((servicePoint) => {
      testData.secondServicePoint = servicePoint.body;

      SettingsReadingRoom.createReadingRoomViaApi(
        testData.secondServicePoint.id,
        testData.secondServicePoint.name,
        testData.secondReadingRoomId,
        false,
      );
    });
    ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then((servicePoint) => {
      testData.thirdServicePoint = servicePoint.body;

      SettingsReadingRoom.createReadingRoomViaApi(
        testData.thirdServicePoint.id,
        testData.thirdServicePoint.name,
        testData.thirdReadingRoomId,
        false,
      );
    });

    cy.createTempUser([Permissions.uiSettingsTenantReadingRoom.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    ServicePoints.deleteViaApi(testData.firstServicePoint.id);
    ServicePoints.deleteViaApi(testData.secondServicePoint.id);
    ServicePoints.deleteViaApi(testData.thirdServicePoint.id);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.firstReadingRoomId);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.secondReadingRoomId);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.thirdReadingRoomId);
  });

  it('C466319 User can view reading room access (volaris)', { tags: ['smoke', 'volaris'] }, () => {
    SettingsReadingRoom.loadReadingRoomRecord();
    SettingsReadingRoom.verifyColumns();
    SettingsReadingRoom.verifyActionsButtonAbsent();
    SettingsReadingRoom.verifyNewButtonAbsent();
    SettingsReadingRoom.verifyPublicCheckboxIsDisabled(testData.firstReadingRoomName);
  });
});
