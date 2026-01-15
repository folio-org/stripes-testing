import TopMenu from '../../../support/fragments/topMenu';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';

describe('Organizations: Settings (Organizations)', () => {
  let user;
  const category = { ...SettingsOrganizations.defaultCategories };

  before('Create user and category', () => {
    cy.getAdminToken();
    SettingsOrganizations.createCategoriesViaApi(category);
    cy.createTempUser([permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.settingsOrganizationsPath,
            waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
          });
          cy.reload();
          SettingsOrganizations.waitLoadingOrganizationSettings();
        }, 20_000);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C367989 Delete category (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C367989'] },
    () => {
      SettingsOrganizations.selectCategories();
      SettingsOrganizations.deleteCategory(category);
    },
  );
});
