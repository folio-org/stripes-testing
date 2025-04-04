import permissions from '../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';

let user;
const fieldMappingProfileName = getTestEntityValue('fieldMappingProfile');
const newTransformationCalloutMessage = '2 transformations have been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

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
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${fieldMappingProfileName}"`,
      }).then((response) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C196758 Create a new mapping profile for MARC bib record with holdings data included - Source record storage (firebird)',
      { tags: ['criticalPath', 'firebird', 'C196758'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, [
          'Source record storage (entire record)',
          'Holdings',
          'Item',
        ]);
        ModalSelectTransformations.verifyCheckboxDisabled('Instance');
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.searchItemTransformationsByName('Holdings - ID');
        ModalSelectTransformations.verifyValueInSearchField('Holdings - ID');
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields('123', '1', '2', 'a');

        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.checkItemRecordTypeChechbox();
        ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
        ModalSelectTransformations.verifyValueInSearchField('Item - ID');
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields('245', '3', '4', 'a');

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Holdings - ID',
          '123',
          '1',
          '2',
          'a',
        );
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - ID',
          '245',
          '3',
          '4',
          'a',
          1,
        );
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);

        ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
      },
    );
  });
});
