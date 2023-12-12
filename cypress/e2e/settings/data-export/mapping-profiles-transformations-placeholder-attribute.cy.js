import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
const newTransformationCalloutMessage = '1 transformation has been successfully added';

describe('settings: data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C345342 Hide placeholder attribute once user populates the first row (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
      ExportNewFieldMappingProfile.createNewFieldMappingProfile('test.1', []);

      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
        '900',
        '0',
        '0',
        '$a',
      );
      ModalSelectTransformations.fillInTransformationsFirstRowMarcTextField('901');
      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
        '',
        '',
        '',
        '',
      );
      ModalSelectTransformations.fillInTransformationsFirstRowMarcTextField('');
      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
        '900',
        '0',
        '0',
        '$a',
      );
      ModalSelectTransformations.fillInTransformationsFirstRowMarcTextField('123');
      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
        '',
        '',
        '',
        '',
      );
      ModalSelectTransformations.fillInTransformationsFirstRowMarcTextField('');
      ModalSelectTransformations.clickTransformationsCancelButton();

      ExportNewFieldMappingProfile.clickAddTransformationsButton();
      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
        '900',
        '0',
        '0',
        '$a',
      );
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('902', '1', '2', '$b');
      ModalSelectTransformations.clickTransformationsSaveAndCloseButton();

      InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
      ExportNewFieldMappingProfile.clickAddTransformationsButton();
      ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsValues(
        '902',
        '1',
        '2',
        '$b',
      );
      ModalSelectTransformations.clickTransformationsCancelButton();
    },
  );
});
