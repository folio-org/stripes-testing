import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Users from '../../../support/fragments/users/users';

describe('Acquisition Units: Settings (ACQ Units)', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
    AcquisitionUnits.newAcquisitionUnit();
    AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
    AcquisitionUnits.assignAdmin();
    cy.createTempUser([
      permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
      permissions.uiFinanceManageAcquisitionUnits.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
    AcquisitionUnits.unAssignAdmin(`${defaultAcquisitionUnit.name}-edited`);
    AcquisitionUnits.delete(`${defaultAcquisitionUnit.name}-edited`);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6729 Update existing acquisition unit (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.fillInAUInfo(`${defaultAcquisitionUnit.name}-edited`);
    },
  );
});
