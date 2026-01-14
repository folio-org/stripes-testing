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

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
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
      'C466279 Add tokens to routing list configuration (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C466279'] },
      () => {
        ListConfiguration.edit();
        ListConfiguration.clickOnAddTokensInBody();
        ListConfiguration.selectToken('routingList.name');
        ListConfiguration.selectToken('routingList.notes');
        ListConfiguration.addToken();
        ListConfiguration.save();
        ListConfiguration.preview();
        ListConfiguration.checkTokenInPreview('Routing Name');
        ListConfiguration.checkTokenInPreview('Routing notes');
        ListConfiguration.closePreviewModal();
        ListConfiguration.edit();
        ListConfiguration.clickOnAddTokensInBody();
        ListConfiguration.selectToken('routingList.name');
        ListConfiguration.addToken();
        ListConfiguration.clickOnAddTokensInBody();
        ListConfiguration.selectToken('routingList.notes');
        ListConfiguration.cancelAddToken();
        ListConfiguration.cancelAndKeepEditing();
        ListConfiguration.clickOnAddTokensInBody();
        ListConfiguration.selectToken('routingList.name');
        ListConfiguration.cancelAddToken();
        ListConfiguration.cancel();
      },
    );
  });
});
