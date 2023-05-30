import { getTestEntityValue } from "../../../support/utils/stringTools";
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import DeleteFieldMappingProfile from "../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile";
import ModalSelectTransformations from "../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations";
import InteractorsTools from "../../../support/utils/interactorsTools";
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SingleFieldMappingProfilePane from "../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane";

let user;
let fieldMappingProfileName = getTestEntityValue('fieldMappingProfile');
let updatedFieldMappingProfileName = getTestEntityValue('updated-fieldMappingProfile');
let description = getTestEntityValue('description');
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const updatedTransformationCalloutMessage = `The transformations have been updated`;
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;
const updatedFieldMappingProfileCalloutMessage = `The field mapping profile ${updatedFieldMappingProfileName} has been successfully saved`

describe('setting: data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });
  });

  beforeEach('go to page', () => {
    cy.visit(SettingsMenu.exportMappingProfilePath)
  });

  after('delete test data', () => {
    ExportFieldMappingProfiles.getFieldMappingProfile({ query: `"name"=="${updatedFieldMappingProfileName}"` })
    .then(response => {
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
    });
    Users.deleteViaApi(user.userId);
  });

  it('C10984 New mapping profile form (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, ['Item']);
    ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
    ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
    ModalSelectTransformations.clickNthCheckbox();
    ModalSelectTransformations.fillInTransformationsTextfields('123', '1', '2', '$a');

    ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
    InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);

    ExportFieldMappingProfiles.saveMappingProfile();
    InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);

    ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
  });

  it('C15826 Editing the existing mapping profile (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    SingleFieldMappingProfilePane.clickProfileNameFromTheList(fieldMappingProfileName);
    SingleFieldMappingProfilePane.verifyActionOptions();
    SingleFieldMappingProfilePane.editFieldMappingProfile(updatedFieldMappingProfileName, description);

    SingleFieldMappingProfilePane.clickEditTransformations();
    ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
    ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
    ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
    ModalSelectTransformations.clickNthCheckbox();
    ModalSelectTransformations.fillInTransformationsTextfields('458', '1', '2', '$a');

    ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
    InteractorsTools.checkCalloutMessage(updatedTransformationCalloutMessage);

    ExportFieldMappingProfiles.saveMappingProfile();
    InteractorsTools.checkCalloutMessage(updatedFieldMappingProfileCalloutMessage);

    ExportFieldMappingProfiles.verifyProfileNameOnTheList(updatedFieldMappingProfileName);
  });
});
