import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const acquisitionMethod = { ...AcquisitionMethods.defaultAcquisitionMethod };
    const { value: acquisitionMethodName } = acquisitionMethod;
    let user;

    before(() => {
      cy.getAdminToken();
      AcquisitionMethods.createNewAcquisitionMethodViaAPI(acquisitionMethod);

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProps) => {
          user = userProps;
          cy.login(user.username, user.password, {
            path: SettingsMenu.acquisitionMethodsPath,
            waiter: AcquisitionMethods.waitLoading,
          });
        },
      );
    });

    after(() => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411608 User can delete acquisition method created via API (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C411608'] },
      () => {
        AcquisitionMethods.checkcreatedAM(acquisitionMethodName);
        AcquisitionMethods.deleteAcquisitionMethod(acquisitionMethodName);
        AcquisitionMethods.checkDeletedAcquisitionMethod(acquisitionMethodName);
      },
    );
  });
});
