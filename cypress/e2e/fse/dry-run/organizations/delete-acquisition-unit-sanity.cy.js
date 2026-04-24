import AcquisitionUnits from '../../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Acquisition Units', () => {
  const testAcquisitionUnit = {
    name: `autotest_au_delete_${getRandomPostfix()}`,
  };
  let userData;

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

    cy.getUsers({ limit: 1, query: `"username"="${user.username}"` }).then((users) => {
      userData = users[0];

      AcquisitionUnits.createAcquisitionUnitViaApi({
        name: testAcquisitionUnit.name,
        protectRead: false,
        protectUpdate: false,
        protectCreate: false,
        protectDelete: false,
      }).then((acqUnitResponse) => {
        testAcquisitionUnit.id = acqUnitResponse.id;

        return AcquisitionUnits.assignUserViaApi(userData.id, testAcquisitionUnit.id);
      });
    });

    cy.login(user.username, user.password, {
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
  });

  after(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    if (testAcquisitionUnit.id) {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testAcquisitionUnit.id);
    }
  });

  it(
    'C6730 Delete acquisition unit (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C6730'] },
    () => {
      AcquisitionUnits.selectAU(testAcquisitionUnit.name);

      AcquisitionUnits.clickActionsButton();
      AcquisitionUnits.checkDeleteButtonDisabled();

      AcquisitionUnits.unAssignUser(
        `${userData.personal.lastName}, ${userData.personal.firstName}`,
        testAcquisitionUnit.name,
      );
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
