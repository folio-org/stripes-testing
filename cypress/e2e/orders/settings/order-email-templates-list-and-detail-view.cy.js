import { Permissions } from '../../../support/dictionary';
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
      'C1621411 Order email templates list and detail view display correctly in Settings > Orders (dresden)',
      { tags: ['extendedPath', 'dresden', 'C1621411'] },
      () => {
        // #1 Click "Order email templates" in the Settings > Orders menu
        SettingOrdersNavigationMenu.selectOrderEmailTemplates();
        OrderEmailTemplates.waitLoading();
        OrderEmailTemplates.verifyListPane(testData.templateName);

        // #2 Click "Bestellung Mono Kauf" in the "Order email templates" list
        OrderEmailTemplates.selectTemplate(testData.templateName);
        OrderEmailTemplates.verifyDetailPaneHeader(testData.templateName);
        OrderEmailTemplates.verifyAccordionsExpanded();

        // #3 Inspect the "General information" accordion
        OrderEmailTemplates.verifyGeneralInformation({
          templateName: testData.templateName,
          active: 'Yes',
        });

        // #4 Inspect the "Template content" accordion
        OrderEmailTemplates.verifyTemplateContent();

        // #5 Inspect the detail pane for the "Record last updated" accordion
        OrderEmailTemplates.verifyRecordLastUpdated();
      },
    );
  });
});
