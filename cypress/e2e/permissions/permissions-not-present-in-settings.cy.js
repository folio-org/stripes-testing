import { getTestEntityValue } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
// Cypress.on('uncaught:exception', () => false);

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
        [permissions.uiUsersPermissions.gui, permissions.uiUsersCreate.gui],
        patronGroup.name,
      )
        .then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C407705 "Settings (Users): Can view transfer criteria" and  "Settings (Users): Can create, edit and remove transfer criteria" permissions are not present in Settings (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.addPermissions([permissions.uiUsersPermissionsView.gui]);
      UserEdit.verifyPermissionDoesNotExist('Settings (Users): Can view transfer criteria');
      UserEdit.verifyPermissionDoesNotExist(
        'Settings (Users): Can create, edit and remove transfer criteria',
      );
    },
  );
});
