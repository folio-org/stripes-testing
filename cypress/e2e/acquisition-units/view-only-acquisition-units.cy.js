import Permissions from '../../support/dictionary/permissions';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Acquisition Units', () => {
  const testAcquisitionUnit = {
    name: `autotest_au_view_${getRandomPostfix()}`,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiSettingsAcquisitionUnitsView.gui]).then((userProperties) => {
      user = userProperties;

      AcquisitionUnits.createAcquisitionUnitViaApi({
        name: testAcquisitionUnit.name,
        protectRead: false,
        protectUpdate: false,
        protectCreate: false,
        protectDelete: false,
      })
        .then((acqUnitResponse) => {
          testAcquisitionUnit.id = acqUnitResponse.id;

          return AcquisitionUnits.assignUserViaApi(user.userId, testAcquisitionUnit.id);
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: SettingsMenu.acquisitionUnitsPath,
            waiter: AcquisitionUnits.waitLoading,
          });
        });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testAcquisitionUnit.id);
  });

  it(
    'C410824 A user with "Settings (acquisition units): View acquisition units" permission can only view appropriate settings (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C410824'] },
    () => {
      AcquisitionUnits.waitLoading();
      AcquisitionUnits.verifyNewButtonAbsent();

      AcquisitionUnits.selectAU(testAcquisitionUnit.name);
      AcquisitionUnits.verifyActionsButtonAbsent();
      AcquisitionUnits.verifyAssignUsersButtonAbsent();
      AcquisitionUnits.verifyDeleteIconAbsent();

      AcquisitionUnits.collapseAll();
      AcquisitionUnits.verifyActionsButtonAbsent();
      AcquisitionUnits.verifyCollapseExpandAll(true);

      AcquisitionUnits.expandAll();
      AcquisitionUnits.verifyActionsButtonAbsent();
      AcquisitionUnits.verifyAssignUsersButtonAbsent();
      AcquisitionUnits.verifyDeleteIconAbsent();
      AcquisitionUnits.verifyCollapseExpandAll(false);
    },
  );
});
