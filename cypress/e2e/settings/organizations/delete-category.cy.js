import permissions from '../../../support/dictionary/permissions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';

describe('Organizations: Settings (Organizations)', () => {
  const category = { ...SettingsOrganizations.defaultCategories };
  let user;
  before(() => {
    cy.getAdminToken();
    SettingsOrganizations.createCategoriesViaApi(category);
    cy.createTempUser([permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui]).then(
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
    SettingsOrganizations.deleteCategory(category);
  });
});
