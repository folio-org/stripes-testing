import permissions from '../../../support/dictionary/permissions';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import OrderTemplate from '../../../support/fragments/settings/orders/orderTemplates';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
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
      cy.createTempUser([permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: SettingsMenu.ordersOrderTemplatesPath,
            waiter: OrderTemplate.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(organization.id);
      AcquisitionMethods.deleteAcquisitionMethodViaAPI(acquisitionMethod.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350602 Select Acquisition Method in Order Template (thunderjet)',
      { tags: ['criticalPathFlaky', 'thunderjet', 'C350602'] },
      () => {
        OrderTemplate.clickNewOrderTemplateButton();
        OrderTemplate.fillTemplateInformationWithAcquisitionMethod(
          orderTemplateName,
          organization.name,
          acquisitionMethod.value,
        );
        OrderTemplate.saveTemplate();
        OrderTemplate.checkTemplateCreated(orderTemplateName);
      },
    );
  });
});
