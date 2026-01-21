import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const { value: acquisitionMethodName } = { ...AcquisitionMethods.defaultAcquisitionMethod };
    const newAcquisitionMethodName = `${acquisitionMethodName}-edited`;

    before(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionMethodsPath,
        waiter: AcquisitionMethods.waitLoading,
      });
    });

    it(
      'C347633 Create Acquisition method (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C347633'] },
      () => {
        AcquisitionMethods.newAcquisitionMethod();
        AcquisitionMethods.fillAcquisitionMethodName(acquisitionMethodName);
        AcquisitionMethods.checkcreatedAM(acquisitionMethodName);
        AcquisitionMethods.editAcquisitionMethod(acquisitionMethodName, newAcquisitionMethodName);
        AcquisitionMethods.deleteAcquisitionMethod(newAcquisitionMethodName);
      },
    );
  });
});
