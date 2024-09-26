import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { ReadingRoom } from '../../support/fragments/settings/tenant/general';

describe('Reading Room Access', () => {
  let userData;
  let servicePointId;
  const readingRoomId = uuid();
  const patronGroup = {
    name: getTestEntityValue('groupPermissions'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
        .then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        })
        .then(() => ReadingRoom.createReadingRoomViaApi(servicePointId, readingRoomId));
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [permissions.uiUserEdit.gui, permissions.uiUsersPermissions.gui],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    ReadingRoom.deleteReadingRoomViaApi(readingRoomId);
  });

  it(
    'C466237 User can view reading room access permission (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.waitLoading();
      UserEdit.addPermissions([permissions.uiSettingsTenantReadingRoom.gui]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([permissions.uiSettingsTenantReadingRoom.gui]);
    },
  );

  it('C466319 User can view reading room access (volaris)', { tags: ['smoke', 'volaris'] }, () => {
    cy.visit(SettingsMenu.tenantPath);
    ReadingRoom.loadReadingRoomRecord();
    ReadingRoom.verifyButtonsDisabled();
  });

  it(
    'C466238 User can create edit and remove reading room access permission (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.waitLoading();
      UserEdit.addPermissions([permissions.uiSettingsTenantReadingRoomAll.gui]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([permissions.uiSettingsTenantReadingRoomAll.gui]);
    },
  );
});
