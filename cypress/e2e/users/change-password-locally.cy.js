import { Heading, including } from '../../../interactors';
import generatePassword from '../../support/utils/generatePassword';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ChangePassword from '../../support/fragments/settings/my-profile/change-password';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Users', () => {
  let userData;
  let servicePointId;
  const newPassword = `${generatePassword()}_${generatePassword()}`;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });
      cy.createTempUser([Permissions.uiSettingsCanChangeLocalPassword.gui]).then(
        (userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password);
        },
      );
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C511 User is able to change password locally (volaris)',
    { tags: ['extendedPath', 'volaris', 'C511'] },
    () => {
      cy.waitForAuthRefresh(() => {
        ChangePassword.openChangePasswordViaUserProfile();
        ChangePassword.checkInitialState();
      });

      ChangePassword.fillPasswordFields(userData.password, newPassword, newPassword);

      ChangePassword.saveNewPassword();
      ChangePassword.verifyPasswordSaved();

      cy.logout();
      cy.login(userData.username, newPassword);

      cy.expect(Heading(including('Welcome')).exists());
    },
  );
});
