import permissions from '../../../support/dictionary/permissions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';

describe('Organizations: Settings (Organizations)', () => {
  const type = { ...SettingsOrganizations.defaultTypes };
  let user;
  before(() => {
    cy.getAdminToken();
    SettingsOrganizations.createTypesViaApi(type);
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

  it(
    'C367990 Delete organization type (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C367990'] },
    () => {
      SettingsOrganizations.selectTypes();
      SettingsOrganizations.deleteType(type);
    },
  );
});
