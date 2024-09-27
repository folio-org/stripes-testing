import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupUser'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [permissions.uiUserCanAssignUnassignPermissions.gui, permissions.uiUsersCreate.gui],
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
  });

  it(
    'C407705 "Settings (Users): Can view transfer criteria" and  "Settings (Users): Can create, edit and remove transfer criteria" permissions are not present in Settings (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openEdit();
      UserEdit.openSelectPermissionsModal();
      UserEdit.verifyPermissionDoesNotExistInSelectPermissions(
        'Settings (Users): Can view transfer criteria',
      );
      UserEdit.verifyPermissionDoesNotExistInSelectPermissions(
        'Settings (Users): Can create, edit and remove transfer criteria',
      );
    },
  );

  it(
    'C422020 Verify that following permissions are invisible (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      const permissionsToCheck = [
        'Settings (Users): Can view owners',
        'Settings (Users): Can view transfer accounts',
        'Settings (Users): Can view transfer criteria',
        'Settings (Users): Can view patron blocks conditions',
        'Settings (Users): Can view patron blocks limits',
        'Settings (Users): Can view patron blocks templates',
        'Settings (Users): Can view feefines ',
        'Settings (Users): Can view manual charges',
        'Settings (Users): Can view comments',
        'Settings (Users): Can view if comment required',
        'Settings (Users): Can view waives',
        'Settings (Users): Can view waive reasons',
        'Settings (Users): Can view payments',
        'Settings (Users): Can view payment methods',
        'Settings (Users): Can view refunds',
        'Settings (Users): Can view refund reasons',
        'Settings (Users): View departments',
        'Settings (Users): Can view departments” and make invisible',
      ];

      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openEdit();
      UserEdit.openSelectPermissionsModal();
      cy.wrap(permissionsToCheck).each((permission) => {
        UserEdit.verifyPermissionDoesNotExistInSelectPermissions(permission);
      });
    },
  );

  it(
    'C402341 Verify that display name for "Settings (Users): Can create, edit and remove manual charges" permission is correct (volaris)',
    { tags: ['extendedPath', 'volaris', 'eurekaPhase1'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.addPermissions(['Settings (Users): Can create, edit and remove manual charges']);
    },
  );
});
