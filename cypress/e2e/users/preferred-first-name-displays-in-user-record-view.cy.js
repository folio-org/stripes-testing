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
        userData.middleName = getTestEntityValue('MiddleName');
        userData.preferredFirstName = getTestEntityValue('PreferredFirstName');
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C11096 Add Preferred first name and confirm its display in the User record View and Edit screens (volaris)',
    { tags: ['extendedPath', 'volaris', 'C11096', 'eurekaPhase1'] },
    () => {
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(userData.username);
      UserEdit.openEdit();
      UserEdit.changeMiddleName(userData.middleName);
      UserEdit.changePreferredFirstName(userData.preferredFirstName);
      UserEdit.saveAndClose();
      UsersSearchPane.waitLoading();
      Users.verifyFullNameIsDisplayedCorrectly(
        `${userData.lastName}, ${userData.preferredFirstName} ${userData.middleName}`,
      );

      UserEdit.openEdit();
      UserEdit.changePreferredFirstName('');
      UserEdit.saveAndClose();
      UsersSearchPane.waitLoading();
      Users.verifyFullNameIsDisplayedCorrectly(
        `${userData.lastName}, ${userData.firstName} ${userData.middleName}`,
      );
    },
  );
});
