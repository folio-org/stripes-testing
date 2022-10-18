import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Users from '../../../support/fragments/users/users';

describe('ui-settings: Acquisitions Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui
    ])
      .then(userProperties => {
        user = userProperties;
      });
    cy.login(user.username, user.password, { path:SettingsMenu.acquisitionUnitsPath, waiter: AcquisitionUnits.waitLoading });
  });

  after(() => {
    cy.loginAsAdmin({ path:SettingsMenu.acquisitionUnitsPath, waiter: AcquisitionUnits.waitLoading });
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);
    Users.deleteViaApi(user.userId);
  });

  it('C6728 Create acquisitions unit (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    AcquisitionUnits.newAcquisitionUnit();
    AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
    AcquisitionUnits.assignAdmin();
  });
});
