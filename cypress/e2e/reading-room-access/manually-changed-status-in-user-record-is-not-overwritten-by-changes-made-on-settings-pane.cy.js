import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
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
    readingRoomName: `Autotest_Reading_Room${getRandomPostfix()}`,
    isPublic: false,
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then((response) => {
        testData.servicePointId = response.body.id;

        SettingsReadingRoom.createReadingRoomViaApi(
          testData.servicePointId,
          testData.servicePoint.name,
          testData.readingRoomId,
          testData.isPublic,
          testData.readingRoomName,
        );
      });
    });

    cy.createTempUser([
      Permissions.uiSettingsTenantReadingRoomAll.gui,
      Permissions.uiCanViewReadingRoomAccess.gui,
      Permissions.uiCanViewEditReadingRoomAccess.gui,
      Permissions.uiSettingsTenantReadingRoom.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      ReadingRoom.allowAccessForUser(
        testData.readingRoomId,
        testData.readingRoomName,
        testData.servicePointId,
        testData.user.userId,
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    ServicePoints.deleteViaApi(testData.servicePointId);
    SettingsReadingRoom.deleteReadingRoomViaApi(testData.readingRoomId);
  });

  it(
    'C476842 Ensure Manually Changed Status in the User Record is Not Overwritten by Changes Made on the Setting page (volaris)',
    { tags: ['criticalPath', 'volaris', 'C476842'] },
    () => {
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersCard.waitLoading();
      UserEdit.openEdit();
      UserEdit.editAccessToReadingRoom(
        testData.readingRoomName,
        'Not allowed',
        'Access permission under review',
      );
      UserEdit.saveAndClose();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsTenantPane.goToTenantTab();
      SettingsTenantPane.selectTenant(TENANTS.READING_ROOM_ACCESS);
      SettingsReadingRoom.edit(testData.readingRoomName);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersCard.expandReadingRoomAccessSection(testData.readingRoomName, 'Not allowed');
    },
  );
});
