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
    cy.loginAsAdmin({ path: SettingsMenu.acquisitionMethodsPath, waiter: AcquisitionMethods.waitLoading });
  });

  it('C347633 Create Acquisition method (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    AcquisitionMethods.newAcquisitionMethod();
    AcquisitionMethods.fillAcquisitionMethodName(acquisitionMethod.value);
    AcquisitionMethods.checkcreatedAM(acquisitionMethod.value);
    AcquisitionMethods.editAcquisitionMethod(acquisitionMethod.value);
    AcquisitionMethods.deleteAcquisitionMethod(acquisitionMethod.value);
  });
});
