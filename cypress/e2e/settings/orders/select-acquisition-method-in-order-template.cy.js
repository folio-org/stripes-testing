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
    Organizations.deleteOrganizationViaApi(organization.id);
    AcquisitionMethods.deleteAcquisitionMethodViaAPI(acquisitionMethod.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350602 Select Acquisition Method in Order Template (thunderjet)',
    { tags: [TestType.criticalPath, devTeams.thunderjet] },
    () => {
      OrderTemplate.newTemplate();
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
