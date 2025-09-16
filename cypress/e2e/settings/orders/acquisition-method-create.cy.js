import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const acquisitionMethod = { ...AcquisitionMethods.defaultAcquisitionMethod };

    before(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionMethodsPath,
        waiter: AcquisitionMethods.waitLoading,
        authRefresh: true,
      });
    });

    it(
      'C347633 Create Acquisition method (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
      () => {
        AcquisitionMethods.newAcquisitionMethod();
        AcquisitionMethods.fillAcquisitionMethodName(acquisitionMethod.value);
        AcquisitionMethods.checkcreatedAM(acquisitionMethod.value);
        AcquisitionMethods.editAcquisitionMethod(acquisitionMethod.value);
        AcquisitionMethods.deleteAcquisitionMethod(acquisitionMethod.value);
      },
    );
  });
});
