import { Permissions } from '../../../support/dictionary';
import OrderTemplate from '../../../support/fragments/settings/orders/orderTemplates';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Settings (Orders)', () => {
  let user;
  const orderTemplate = OrderTemplate.getDefaultOrderTemplate({ additionalProperties: {} });
  const { templateName } = orderTemplate;

  before('Create user and order template via API', () => {
    cy.getAdminToken();
    OrderTemplate.createOrderTemplateViaApi(orderTemplate);

    cy.createTempUser([Permissions.uiSettingsOrdersCanViewEditDeleteOrderTemplates.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.ordersOrderTemplatesPath,
          waiter: OrderTemplate.waitLoading,
        });
      },
    );
  });

  after('Cleanup user', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });
  });

  it('C6727 Delete order template (thunderjet)', { tags: ['thunderjet', 'C6727'] }, () => {
    OrderTemplate.checkTemplateCreated(templateName);
    OrderTemplate.selectTemplate(templateName);
    OrderTemplate.deleteTemplate(templateName, 'Cancel');
    OrderTemplate.deleteTemplate(templateName);
  });
});
