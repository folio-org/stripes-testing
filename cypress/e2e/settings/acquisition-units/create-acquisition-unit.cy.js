import permissions from '../../../support/dictionary/permissions';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Acquisition Units', () => {
  describe('Settings (ACQ Units)', () => {
    const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
    let user;

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
        permissions.uiFinanceManageAcquisitionUnits.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });
    });

    after(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
      AcquisitionUnits.delete(defaultAcquisitionUnit.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C6728 Create acquisitions unit (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C6728'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: SettingsMenu.acquisitionUnitsPath,
            waiter: AcquisitionUnits.waitLoading,
          });
        }, 20_000);
        AcquisitionUnits.newAcquisitionUnit();
        AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
        AcquisitionUnits.assignAdmin();
      },
    );
  });
});
