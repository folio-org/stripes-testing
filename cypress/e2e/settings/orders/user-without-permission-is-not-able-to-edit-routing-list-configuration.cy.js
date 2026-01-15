import permissions from '../../../support/dictionary/permissions';
import ListConfiguration from '../../../support/fragments/settings/orders/listConfiguration';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

Cypress.on('uncaught:exception', () => false);

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let user;

    before(() => {
      cy.getAdminToken();

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: SettingsMenu.ordersListConfigurationPath,
            waiter: ListConfiguration.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466273 A user without " Settings (Orders): Can view and edit all settings" permission is not able to edit routing list configuration (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C466273'] },
      () => {
        ListConfiguration.editIsDisabled();
        ListConfiguration.preview();
        ListConfiguration.closePreviewModal();
        ListConfiguration.editIsDisabled();
      },
    );
  });
});
