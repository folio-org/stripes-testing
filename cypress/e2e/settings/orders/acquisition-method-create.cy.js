import devTeams from '../../../support/dictionary/devTeams';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('orders: Settings', () => {
  const acquisitionMethod = { ...AcquisitionMethods.defaultAcquisitionMethod };

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
