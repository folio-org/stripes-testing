import permissions from '../../../support/dictionary/permissions';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

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

  it(
    'C407766: A user with "Settings (Organizations): View settings" permission can only view appropriate settings (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      SettingsOrganizations.selectCategories();
      SettingsOrganizations.checkButtonNewInCategoriesIsDisabled();
      SettingsOrganizations.selectTypes();
      SettingsOrganizations.checkButtonNewInTypesIsDisabled();
    },
  );
});
