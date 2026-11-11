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
  describe('Permissions', () => {
    describe('My Profile', () => {
      let userData;
      let servicePointId;
      const newPassword = generatePassword(12) + '!1';
      const newWrongPassword = generatePassword(12) + '!2';

      before('Preconditions', () => {
        cy.getAdminToken().then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            servicePointId = servicePoint.id;
          });
          cy.createTempUser([Permissions.uiSettingsCanChangeLocalPassword.gui]).then(
            (userProperties) => {
              userData = userProperties;
              UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
            },
          );
        });
      });

      beforeEach('Login', () => {
        cy.login(userData.username, userData.password, {
          path: SettingsMenu.myProfilePath,
          waiter: MyProfile.waitLoading,
        });
      });

      after('Deleting created entities', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C410871 Verify that my profile page title follows correct format (vega)',
        { tags: ['extendedPath', 'vega', 'C410871'] },
        () => {
          MyProfile.waitLoading();
          MyProfile.openChangePassword();
          ChangePassword.waitLoading();
        },
      );

      it(
        'C374116 Verify that validation violations are displayed immediately in the "Change password" section (vega)',
        { tags: ['extendedPath', 'vega', 'C374116'] },
        () => {
          cy.intercept('GET', '/tenant/rules?*').as('rules');

          MyProfile.openChangePassword();

          cy.wait('@rules', getLongDelay()).then((rulesResp) => {
            expect(rulesResp.response.statusCode).to.eq(200);
          });

          ChangePassword.checkInitialState();

          ChangePassword.typeCurrentPassword('Q');
          ChangePassword.typeSpecialCharactersCurrentNewPassword('{backspace}');
          ChangePassword.typeNewPassword('aA1!#');
          ChangePassword.typeSpecialCharactersIntoNewPassword('{backspace}');
          ChangePassword.verifyCurrentPasswordMessage(ChangePassword.messages.enterValue);
          ChangePassword.verifyNewPasswordMessage(ChangePassword.messages.notEnoughSymbols);

          ChangePassword.typeConfirmPassword('bB1!');
          ChangePassword.verifyConfirmPasswordMessage(ChangePassword.messages.mismatch);
        },
      );

      it(
        'C375097 Verify that "Save" button is disabled in case of validation errors on "My profile" form (vega)',
        { tags: ['extendedPath', 'vega', 'C375097'] },
        () => {
          MyProfile.openChangePassword();
          ChangePassword.checkInitialState();

          ChangePassword.typeCurrentPassword('Q');
          ChangePassword.typeSpecialCharactersCurrentNewPassword('{backspace}');
          ChangePassword.typeNewPassword('Q2&3^eY');
          ChangePassword.typeSpecialCharactersIntoNewPassword('{backspace}');
          ChangePassword.verifyNewPasswordMessage(ChangePassword.messages.notEnoughSymbols);
          ChangePassword.verifyCurrentPasswordMessage(ChangePassword.messages.enterValue);
          ChangePassword.verifySaveButtonInactive();
          ChangePassword.clearAllFields();

          ChangePassword.typeNewPassword(newPassword);
          ChangePassword.typeConfirmPassword(newWrongPassword);
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
          ChangePassword.typeConfirmPassword(newWrongPassword);
          ChangePassword.verifyConfirmPasswordMessage(ChangePassword.messages.mismatch);
          ChangePassword.verifySaveButtonInactive();
          ChangePassword.typeConfirmPassword(newPassword);
          ChangePassword.saveNewPassword();
          cy.wait(2000);

          cy.logout();
          cy.login(userData.username, newPassword);
        },
      );
    });
  });
});
