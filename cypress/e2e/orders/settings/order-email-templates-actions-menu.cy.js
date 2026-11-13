import { Permissions } from '../../../support/dictionary';
import { COMMON_BUTTON_LABELS } from '../../../support/constants';
import OrderEmailTemplates from '../../../support/fragments/settings/orders/orderEmailTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      user: {},
      // Pre-existing email template (test case precondition), no API fragment is available to create it
      templateName: 'Bestellung Mono Kauf',
    };

    before('Create test user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.ordersPath,
            waiter: SettingsOrders.waitLoadingOrderSettings,
          });
        },
      );
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1621412 Actions menu on order email template detail view shows Duplicate, Edit, and Delete (dresden)',
      { tags: ['extendedPath', 'dresden', 'C1621412'] },
      () => {
        // Precondition: "Bestellung Mono Kauf" template detail pane is open
        SettingOrdersNavigationMenu.selectOrderEmailTemplates();
        OrderEmailTemplates.waitLoading();
        OrderEmailTemplates.selectTemplate(testData.templateName);
        OrderEmailTemplates.verifyDetailPaneHeader(testData.templateName);

        // #1 Click the "Actions" button on the "Bestellung Mono Kauf" detail pane
        OrderEmailTemplates.openActionsMenu(testData.templateName);
        OrderEmailTemplates.verifyActionsMenuOptions([
          COMMON_BUTTON_LABELS.DUPLICATE,
          COMMON_BUTTON_LABELS.EDIT,
          COMMON_BUTTON_LABELS.DELETE,
        ]);
      },
    );
  });
});
