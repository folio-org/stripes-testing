import permissions from '../../../../support/dictionary/permissions';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

let user;
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const fieldForTransformation = 'Holdings - Call number - Call number';
const placeholderValues = ['900', '\\', '\\', 'a'];
const emptyPlaceholders = ['', '', '', ''];

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C345342 Hide placeholder attribute once user populates the first row (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C345342'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
        ExportNewFieldMappingProfile.createNewFieldMappingProfile('test.1', []);

        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...placeholderValues,
        );
        ModalSelectTransformations.typeInTransformationsMarcTextField('901');
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...emptyPlaceholders,
        );

        ModalSelectTransformations.removeValueFromTransformationsMarcTextField();
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...placeholderValues,
        );

        ModalSelectTransformations.typeInTransformationsMarcTextField(' ');
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...emptyPlaceholders,
        );

        ModalSelectTransformations.clickTransformationsCancelButton();
        ModalSelectTransformations.verifyModalTransformationExists(false);
        cy.wait(1000);

        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...placeholderValues,
        );

        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.typeInTransformationsMarcTextField('001');
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        ModalSelectTransformations.verifyModalTransformationExists(false);
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyNewFieldMappingProfileFormIsOpened();
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          fieldForTransformation,
          '001',
          '',
          '',
          '',
        );
        cy.wait(1000);

        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.verifyFieldSelectedForTransformationByName(
          fieldForTransformation,
        );
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsValues('001', '', '', '');
        ModalSelectTransformations.verifyTransformationsFirstRowTextFieldsPlaceholders(
          ...placeholderValues,
        );
      },
    );
  });
});
