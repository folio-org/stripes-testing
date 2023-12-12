import SettingsMenu from '../../../support/fragments/settingsMenu';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';

describe('orders: Settings', () => {
  const acquisitionMethod = { ...AcquisitionMethods.defaultAcquisitionMethod };

  before(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionMethodsPath,
      waiter: AcquisitionMethods.waitLoading,
    });
  });

  it(
    'C347633 Create Acquisition method (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      AcquisitionMethods.newAcquisitionMethod();
      AcquisitionMethods.fillAcquisitionMethodName(acquisitionMethod.value);
      AcquisitionMethods.checkcreatedAM(acquisitionMethod.value);
      AcquisitionMethods.editAcquisitionMethod(acquisitionMethod.value);
      AcquisitionMethods.deleteAcquisitionMethod(acquisitionMethod.value);
    },
  );
});
