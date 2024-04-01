import { getLongDelay } from '../../support/utils/cypressTools';
import generatePassword from '../../support/utils/generatePassword';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ChangePassword from '../../support/fragments/settings/my-profile/change-password';
import MyProfile from '../../support/fragments/settings/my-profile/my-profile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Permissions', () => {
  describe('Permissions --> My Profile', () => {
    let userData;
    let servicePointId;
    const newPassword = generatePassword();
    const newInvalidPassword = generatePassword();

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
          (servicePoints) => {
            servicePointId = servicePoints[0].id;
          },
        );
        cy.createTempUser([Permissions.uiSettingsCanChangeLoacalPassword.gui]).then(
          (userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          },
        );
      });
    });

    beforeEach('Login', () => {
      cy.login(userData.username, userData.password);
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C410871 Verify that my profile page title follows correct format (volaris)',
      { tags: ['extendedPath', 'volaris'] },
      () => {
        cy.visit(SettingsMenu.myProfilePath);
        MyProfile.waitLoading();
        MyProfile.openChangePassword();
        ChangePassword.waitLoading();
      },
    );

    it(
      'C374116 Verify that validation violations are displayed immediately in the "Change password" section (volaris)',
      { tags: ['extendedPath', 'volaris'] },
      () => {
        cy.intercept('GET', '*/rules ').as('rules');
        ChangePassword.openChangePasswordViaUserProfile();
        ChangePassword.checkInitialState();

        cy.wait('@rules', getLongDelay()).then((rulesResp) => {
          expect(rulesResp.response.statusCode).to.eq(200);
        });

        cy.wait(5000);
        ChangePassword.typeNewPassword('a');
        ChangePassword.verifyCurrentPasswordMessage(ChangePassword.messages.enterValue);
        ChangePassword.verifyNewPasswordMessage(ChangePassword.messages.notEnoughSymbols);

        ChangePassword.typeConfirmPassword('b');
        ChangePassword.verifyConfirmPasswordMessage(ChangePassword.messages.mismatch);
      },
    );

    it(
      'C375097 Verify that "Save" button is disabled in case of validation errors on "My profile" form (volaris)',
      { tags: ['extendedPath', 'volaris'] },
      () => {
        ChangePassword.openChangePasswordViaUserProfile();
        ChangePassword.checkInitialState();

        cy.wait(5000);
        ChangePassword.typeNewPassword('a');
        ChangePassword.verifyNewPasswordMessage(ChangePassword.messages.notEnoughSymbols);
        ChangePassword.verifyCurrentPasswordMessage(ChangePassword.messages.enterValue);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.clearAllFields();

        ChangePassword.typeNewPassword(newPassword);
        ChangePassword.typeConfirmPassword(newInvalidPassword);
        ChangePassword.verifyConfirmPasswordMessage(ChangePassword.messages.mismatch);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.clearAllFields();

        ChangePassword.typeNewPassword(newPassword);
        ChangePassword.typeConfirmPassword(newPassword);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.clearAllFields();

        ChangePassword.typeCurrentPassword(userData.password);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.typeNewPassword(newPassword);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.typeConfirmPassword(newInvalidPassword);
        ChangePassword.verifyConfirmPasswordMessage(ChangePassword.messages.mismatch);
        ChangePassword.verifySaveButtonInactive();
        ChangePassword.typeConfirmPassword(newPassword);
        ChangePassword.saveNewPassword();
        cy.logout();

        cy.login(userData.username, newPassword);
      },
    );
  });
});
