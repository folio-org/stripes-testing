import permissions from '../../support/dictionary/permissions';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Acquisition Units', () => {
  const testAcquisitionUnit = {
    name: `autotest_au_delete_${getRandomPostfix()}`,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
      permissions.uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments.gui,
    ]).then((userProperties) => {
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
          cy.login(userProperties.username, userProperties.password, {
            path: SettingsMenu.acquisitionUnitsPath,
            waiter: AcquisitionUnits.waitLoading,
          });
        });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    if (testAcquisitionUnit.id) {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testAcquisitionUnit.id);
    }
  });

  it(
    'C6730 Delete acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6730'] },
    () => {
      AcquisitionUnits.selectAU(testAcquisitionUnit.name);

      AcquisitionUnits.clickActionsButton();
      AcquisitionUnits.checkDeleteButtonDisabled();

      AcquisitionUnits.unAssignUser(user.username, testAcquisitionUnit.name);
      AcquisitionUnits.checkNoAssignedUsers();

      AcquisitionUnits.clickActionsButton();
      AcquisitionUnits.checkDeleteButtonDisabled(false);

      AcquisitionUnits.clickDeleteOption();
      AcquisitionUnits.checkDeleteModalAppears();

      AcquisitionUnits.clickCancelInDeleteModal();
      cy.reload();

      AcquisitionUnits.clickActionsButton();
      AcquisitionUnits.clickDeleteOption();

      AcquisitionUnits.clickConfirmInDeleteModal();
      AcquisitionUnits.checkAcquisitionUnitDeleted(testAcquisitionUnit.name);
    },
  );
});
