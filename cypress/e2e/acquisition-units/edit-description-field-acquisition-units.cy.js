import permissions from '../../support/dictionary/permissions';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Acquisition Units', () => {
  const testAcquisitionUnit = {
    name: `autotest_au_description_${getRandomPostfix()}`,
    description: 'Test',
    updatedDescription: 'Test edited',
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui]).then(
      (userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    if (testAcquisitionUnit.id) {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testAcquisitionUnit.id);
    }
  });

  it(
    'C423471 Adding and editing information in "Description" field in "Settings" -> "Acquisition units" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423471'] },
    () => {
      AcquisitionUnits.waitLoading();

      AcquisitionUnits.newAcquisitionUnit();

      AcquisitionUnits.verifyDescriptionFieldExists();
      AcquisitionUnits.verifyDescriptionFieldEmpty();

      AcquisitionUnits.fillDescription(testAcquisitionUnit.description);
      AcquisitionUnits.verifyDescriptionValue(testAcquisitionUnit.description);

      AcquisitionUnits.fillName(testAcquisitionUnit.name);

      AcquisitionUnits.clickSaveButton();

      cy.wait(2000);
      AcquisitionUnits.getAcquisitionUnitIdFromUrl().then((id) => {
        testAcquisitionUnit.id = id;
      });

      AcquisitionUnits.verifyDescriptionInDetailsPane(testAcquisitionUnit.description);

      AcquisitionUnits.clickActionsButton();
      AcquisitionUnits.clickEditOption();

      AcquisitionUnits.verifyDescriptionFieldExists();
      AcquisitionUnits.verifyDescriptionValue(testAcquisitionUnit.description);

      AcquisitionUnits.fillDescription(testAcquisitionUnit.updatedDescription);
      AcquisitionUnits.verifyDescriptionValue(testAcquisitionUnit.updatedDescription);

      AcquisitionUnits.clickSaveButton();

      AcquisitionUnits.verifyDescriptionInDetailsPane(testAcquisitionUnit.updatedDescription);
    },
  );
});
