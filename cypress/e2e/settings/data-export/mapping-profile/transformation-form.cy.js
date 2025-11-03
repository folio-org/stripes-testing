import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('creating user and navigating to settings', () => {
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

    after('delete job and user', () => {
      cy.getAdminToken();
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${fieldMappingProfileName}"`,
      }).then((response) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15819 Transformation form (firebird)',
      { tags: ['criticalPath', 'firebird', 'C15819'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, [
          'Item',
        ]);
        ModalSelectTransformations.verifySearchAndFilterPane();
        ModalSelectTransformations.searchText('text');
        ModalSelectTransformations.verifySearchResultIncludes(['text']);
        ModalSelectTransformations.clickResetAll();
        ModalSelectTransformations.searchText('TEXT');
        ModalSelectTransformations.verifySearchResultIncludes(['text']);

        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
        ModalSelectTransformations.verifySearchResultIncludes(['Item']);
        ModalSelectTransformations.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);

        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.checkInstanceRecordTypeChechbox();
        ModalSelectTransformations.checkHoldingsRecordTypeChechbox();
        ModalSelectTransformations.verifySearchResultIncludes(['Holdings', 'Instance']);
        ModalSelectTransformations.verifySearchResultDoesNotInclude(['Item']);
        ModalSelectTransformations.clickResetAll();

        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.verifyTotalSelected('1');

        ModalSelectTransformations.uncheckUnselectedStatusChechbox();
        ModalSelectTransformations.checkUnselectedStatusChechbox();
        ModalSelectTransformations.uncheckSelectedStatusChechbox();
        ModalSelectTransformations.checkSelectedStatusChechbox();

        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.verifyTotalSelected('0');

        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
        ModalSelectTransformations.verifySearchResultIncludes(['Item']);
        ModalSelectTransformations.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);
        ModalSelectTransformations.clickNthCheckbox();

        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          'Item - Barcode',
          '456',
          '1',
          '',
          'a',
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - Barcode',
          '456',
          '1',
          '\\',
          'a',
        );

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);
      },
    );
  });
});
