import { Permissions } from '../../../support/dictionary';
import OrderTemplate from '../../../support/fragments/settings/orders/orderTemplates';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      user: {},
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.ordersOrderTemplatesPath,
            waiter: OrderTemplate.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C916262 Order template can not be saved, empty field is highlighted, and corresponding accordion is expanded when required field is not filled (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C916262'] },
      () => {
        // Click "New" button
        const OrderTemplateForm = OrderTemplate.clickNewOrderTemplateButton();
        OrderTemplateForm.checkOrderTemplateFormContent();

        // Fill in any **non-mandatory** field (e.g. "Description" field)
        OrderTemplateForm.fillOrderTemplateFields({
          templateInformation: {
            templateDescription: `autotest_description_${getRandomPostfix()}`,
          },
        });

        // Click "Save" button at the top right corner
        OrderTemplateForm.clickSaveButton({ templateCreated: false });
        OrderTemplateForm.checkValidationError({ templateName: 'Required!' });
      },
    );
  });
});
