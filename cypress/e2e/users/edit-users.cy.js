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
  const newMiddleName = getTestEntityValue('newMiddleName');
  const patronGroup = {
    name: getTestEntityValue('groupUserChange'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
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
    'C398021 Verify that user is able to edit user records without error messages (volaris)',
    { tags: ['extendedPath', 'volaris', 'C398021', 'eurekaPhase1'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openEdit();
      UserEdit.changeMiddleName(newMiddleName);
      UserEdit.saveAndClose();
      Users.verifyMiddleNameOnUserDetailsPane(newMiddleName);
    },
  );

  it(
    'C407662 "User search results" pane results remain after canceling user\'s profile editing (volaris)',
    { tags: ['extendedPath', 'volaris', 'C407662', 'eurekaPhase1'] },
    () => {
      userData.middleName = newMiddleName;
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openEdit();
      UserEdit.verifySaveAndCloseIsDisabled(true);
      UserEdit.changeMiddleName(getTestEntityValue('newName'));
      UserEdit.verifySaveAndCloseIsDisabled(false);
      UserEdit.cancelChanges();
      Users.verifyMiddleNameOnUserDetailsPane(userData.middleName);
      Users.verifyFullNameIsDisplayedCorrectly(
        `${userData.lastName}, ${userData.preferredFirstName} ${userData.middleName}`,
      );
    },
  );
});
