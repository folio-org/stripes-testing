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
const newTransformationCalloutMessage = '2 transformations have been successfully added';
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
    cy.getAdminToken();
    ExportFieldMappingProfiles.getFieldMappingProfile({
      query: `"name"=="${fieldMappingProfileName}"`,
    }).then((response) => {
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10983 Create a new mapping profile for MARC bib record with holdings data included - Instance record (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, [
        'Inventory instance (selected fields)',
        'Holdings',
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

      ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);

      ExportFieldMappingProfiles.saveMappingProfile();
      InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);

      ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
    },
  );
});
