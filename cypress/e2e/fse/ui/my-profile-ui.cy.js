import MyProfile from '../../../support/fragments/settings/my-profile/my-profile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ChangePassword from '../../../support/fragments/settings/my-profile/change-password';

describe('fse-my-profile - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.myProfilePath,
      waiter: MyProfile.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195470 - verify that change password page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'myProfile', 'fse-user-journey', 'TC195470'] },
    () => {
      MyProfile.openChangePassword();
      ChangePassword.waitLoading();
      ChangePassword.checkInitialState();
    },
  );
});
