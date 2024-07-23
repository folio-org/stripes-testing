import MyProfile from '../../../support/fragments/settings/my-profile/my-profile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ChangePassword from '../../../support/fragments/settings/my-profile/change-password';

describe('fse-my-profile - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195470 - verify that change password page is displayed',
    { tags: ['fse', 'ui', 'myProfile'] },
    () => {
      cy.visit(SettingsMenu.myProfilePath);
      MyProfile.waitLoading();
      MyProfile.openChangePassword();
      ChangePassword.waitLoading();
      ChangePassword.checkInitialState();
    },
  );
});
