import permissions from '../../../support/dictionary/permissions';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import OrderTemplate from '../../../support/fragments/settings/orders/orderTemplates';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

Cypress.on('uncaught:exception', () => false);

describe('orders: Settings', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const acquisitionMethod = { ...AcquisitionMethods.defaultAcquisitionMethod };
  const orderTemplateName = `OTname${getRandomPostfix()}`;
  let user;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    AcquisitionMethods.createNewAcquisitionMethodViaAPI(acquisitionMethod);
    cy.createTempUser([
      permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
      permissions.uiSettingsOrdersCanViewEditDeleteOrderTemplates.gui,
      permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: SettingsMenu.ordersOrderTemplatesPath,
          waiter: OrderTemplate.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    AcquisitionMethods.deleteAcquisitionMethodViaAPI(acquisitionMethod.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6725 Create order template (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      OrderTemplate.clickNewOrderTemplateButton();
      OrderTemplate.fillTemplateInformationWithAcquisitionMethod(
        orderTemplateName,
        organization.name,
        acquisitionMethod.value,
      );
      OrderTemplate.saveTemplate();
      OrderTemplate.checkTemplateCreated(orderTemplateName);
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderByTemplate(orderTemplateName);
      Orders.checkCreatedOrderFromTemplate(organization.name);
      cy.visit(SettingsMenu.ordersOrderTemplatesPath);
      OrderTemplate.deleteTemplate(orderTemplateName);
    },
  );
});
