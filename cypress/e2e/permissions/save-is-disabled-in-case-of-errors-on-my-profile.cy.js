import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import arrays from '../../support/utils/arrays';
import { getTestEntityValue } from '../../support/utils/stringTools';
import generatePassword from '../../support/utils/generatePassword';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import ChangePassword from '../../support/fragments/settings/my-profile/change-password';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MyProfile from '../../support/fragments/settings/my-profile/my-profile';

describe('Permissions --> My Profile', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupMyProfile'),
  };
  const newPassword = generatePassword();
  const newInvalidPassword = generatePassword();
  const randomChar = arrays.getRandomElement(arrays.genCharArray('a', 'z'));

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([permissions.uiSettingsCanChangeLoacalPassword.gui], patronGroup.name).then(
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
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C410871 Verify that my profile page title follows correct format (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.myProfilePath);
      MyProfile.waitLoading();
      MyProfile.openChangePassword();
      ChangePassword.waitLoading();
    },
  );

  it(
    'C375097 Verify that "Save" button is disabled in case of validation errors on "My profile" form (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      ChangePassword.openChangePasswordViaUserProfile();
      ChangePassword.checkInitialState();

      cy.wait(2000);
      ChangePassword.typeNewPassword(randomChar);
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
