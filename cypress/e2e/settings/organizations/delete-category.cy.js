import permissions from '../../../support/dictionary/permissions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';

describe('Organizations: Settings (Organizations)', () => {
  let user;
  before(() => {
    cy.createTempUser([permissions.uiSettingsOrganizationsCanViewOnlySettings.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.organizationsPath,
          waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it('C367989: Delete category (thunderjet)', { tags: ['criticalPth', 'thunderjet'] }, () => {
    SettingsOrganizations.selectCategories();
    SettingsOrganizations.checkButtonNewInCategoriesIsDisabled();
    SettingsOrganizations.selectTypes();
    SettingsOrganizations.checkButtonNewInTypesIsDisabled();
  });
});
