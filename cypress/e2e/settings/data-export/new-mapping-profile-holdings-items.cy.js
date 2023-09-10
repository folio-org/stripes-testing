import { getTestEntityValue } from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
const fieldMappingProfileName = getTestEntityValue('fieldMappingProfile');
const newTransformationCalloutMessage = '3 transformations have been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

describe('Mapping profile - setup', () => {
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
    ExportFieldMappingProfiles.getFieldMappingProfile({
      query: `"name"=="${fieldMappingProfileName}"`,
    }).then((response) => {
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15821 Create a new mapping profile for MARC bib record with holdings and items data inluded (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, [
        'Inventory instance (selected fields)',
        'Holdings',
        'Item',
      ]);
      ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
      ModalSelectTransformations.uncheckItemRecordTypeChechbox();
      ModalSelectTransformations.searchItemTransformationsByName('Instance - ID');
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('123', '1', '2', '$a');

      ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
      ModalSelectTransformations.checkHoldingsRecordTypeChechbox();
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('245', '3', '4', '$a');

      ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
      ModalSelectTransformations.checkItemRecordTypeChechbox();
      ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('356', '5', '6', '$a');

      ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);

      ExportFieldMappingProfiles.saveMappingProfile();
      InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);

      ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
    },
  );
});
