import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsTenantPane, { TENANTS } from '../../support/fragments/settings/tenant/tenantPane';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then((response) => {
        testData.servicePointId = response.body.id;
      });
    });

    cy.createTempUser(
      [
        Permissions.uiSettingsTenantReadingRoomAll.gui,
        Permissions.uiCanViewReadingRoomAccess.gui,
        Permissions.uiSettingsTenantReadingRoom.gui,
      ],
      'staff',
    ).then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.user.userId,
        testData.servicePointId,
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePointId]);
    ServicePoints.deleteViaApi(testData.servicePointId);
    // SettingsTenantPane.goToTenantTab();
    // SettingsTenantPane.selectTenant(TENANTS.READING_ROOM_ACCESS);
    // SettingsReadingRoom.delete(testData.readingRoomId);
  });

  it(
    'C471502 Reading room details are reflected on user details pane accordingly when reading room is edited (volaris)',
    { tags: ['criticalPath', 'volaris', 'C471502'] },
    () => {
      const readingRoom = {
        name: `ReadingRoom${getRandomPostfix()}`,
        servicePointName: testData.servicePoint.name,
      };

      SettingsTenantPane.goToTenantTab();
      SettingsTenantPane.selectTenant(TENANTS.READING_ROOM_ACCESS);
      SettingsReadingRoom.verifyReadingRoomPaneExists();
      SettingsReadingRoom.create(readingRoom);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersCard.expandReadingRoomAccessSection(readingRoom.name, 'Allowed');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsTenantPane.goToTenantTab();
      SettingsTenantPane.selectTenant(TENANTS.READING_ROOM_ACCESS);
      SettingsReadingRoom.edit(readingRoom.name);
      SettingsReadingRoom.verifyPublicCheckboxIsDisabled(readingRoom.name);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersCard.expandReadingRoomAccessSection(readingRoom.name, 'Not allowed');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsTenantPane.goToTenantTab();
      SettingsTenantPane.selectTenant(TENANTS.READING_ROOM_ACCESS);
      SettingsReadingRoom.delete(readingRoom.name);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersCard.expandReadingRoomAccessSection(readingRoom.name, 'Not allowed', false);
    },
  );
});
