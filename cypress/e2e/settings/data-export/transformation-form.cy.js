import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import TransformationForm from '../../../support/fragments/settings/data-export/transformation-form';

let user;
let fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

describe('settings: data-export', () => {
    before('creating user and navigating to settings', () => {
        cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.dataExportEnableSettings.gui,
            permissions.dataExportEnableApp.gui,
        ])
            .then(userProperties => {
                user = userProperties;
                cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
            });
    });

    after('deleting user', () => {
        Users.deleteViaApi(user.userId);
    });

    it('C15819 Transformation form (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
        ExportFieldMappingProfiles.goTofieldMappingProfilesTab();
        ExportNewFieldMappingProfile.createNewFieldMappingProfile(fieldMappingProfileName, 'Item');
        TransformationForm.verifySearchAndFilterPane();
        TransformationForm.searchText('text');
        TransformationForm.verifySearchResultIncludes(['text']);
        TransformationForm.clickResetAll();
        TransformationForm.searchText('TEXT');
        TransformationForm.verifySearchResultIncludes(['text']);

        TransformationForm.uncheckHoldingsRecordTypeChechbox();
        TransformationForm.uncheckInstanceRecordTypeChechbox();
        TransformationForm.verifySearchResultIncludes(['Item']);
        TransformationForm.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);

        TransformationForm.uncheckItemRecordTypeChechbox();
        TransformationForm.checkInstanceRecordTypeChechbox();
        TransformationForm.checkHoldingsRecordTypeChechbox();
        TransformationForm.verifySearchResultIncludes(['Holdings', 'Instance']);
        TransformationForm.verifySearchResultDoesNotInclude(['Item']);
        TransformationForm.clickResetAll();

        TransformationForm.clickNthCheckbox();
        TransformationForm.verifyTotalSelected('1');

        TransformationForm.uncheckUnselectedStatusChechbox();
        TransformationForm.checkUnselectedStatusChechbox();
        TransformationForm.uncheckSelectedStatusChechbox();
        TransformationForm.checkSelectedStatusChechbox();

        TransformationForm.clickNthCheckbox();
        TransformationForm.verifyTotalSelected('0');

        TransformationForm.uncheckHoldingsRecordTypeChechbox();
        TransformationForm.uncheckInstanceRecordTypeChechbox();
        TransformationForm.verifySearchResultIncludes(['Item']);
        TransformationForm.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);
        TransformationForm.clickNthCheckbox();


        TransformationForm.fillInTransformationsTextfields('456', '1', '2', '$a');
        TransformationForm.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);
    });
});
