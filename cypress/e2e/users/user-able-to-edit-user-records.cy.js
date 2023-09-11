import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Permissions Tags', () => {
  let userData;
  let servicePointId;
  const newMiddleName = getTestEntityValue('newMiddleName');
  const patronGroup = {
    name: getTestEntityValue('groupUserChange'),
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
        [permissions.uiUserEdit.gui, permissions.uiUsersPermissionsView.gui],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
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
    'C398021 Verify that user is able to edit user records without error messages (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openUserEdit();
      UserEdit.changeMiddleName(newMiddleName);
      UserEdit.saveAndClose();
      Users.verifyMiddleNameOnUserDetailsPane(newMiddleName);
    },
  );
});
