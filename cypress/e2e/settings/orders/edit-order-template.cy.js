import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderTemplate from '../../../support/fragments/settings/orders/orderTemplates';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Orders from '../../../support/fragments/orders/orders';
import TopMenu from '../../../support/fragments/topMenu';

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
    cy.loginAsAdmin({
      path: SettingsMenu.ordersOrderTemplatesPath,
      waiter: OrderTemplate.waitLoading,
    });
    OrderTemplate.newTemplate();
    OrderTemplate.fillTemplateInformationWithAcquisitionMethod(
      orderTemplateName,
      organization.name,
      acquisitionMethod.value,
    );
    OrderTemplate.saveTemplate();
    OrderTemplate.checkTemplateCreated(orderTemplateName);
    cy.createTempUser([
      permissions.uiSettingsOrdersCanViewEditOrderTemplates.gui,
      permissions.uiSettingsOrdersCanViewEditDeleteOrderTemplates.gui,
      permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.ordersOrderTemplatesPath,
        waiter: OrderTemplate.waitLoading,
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
    'C6726 Edit existing order template (thunderjet)',
    { tags: [TestType.criticalPath, devTeams.thunderjet] },
    () => {
      OrderTemplate.selectTemplate(orderTemplateName);
      OrderTemplate.editTemplate(orderTemplateName);
      OrderTemplate.checkTemplateCreated(`${orderTemplateName}-edited`);
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderByTemplate(`${orderTemplateName}-edited`);
      Orders.checkCreatedOrderFromTemplate(organization.name);
      cy.visit(SettingsMenu.ordersOrderTemplatesPath);
      OrderTemplate.deleteTemplate(`${orderTemplateName}-edited`);
    },
  );
});
