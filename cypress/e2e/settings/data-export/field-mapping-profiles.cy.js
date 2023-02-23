import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import FieldMappingProfiles from '../../../support/fragments/settings/data-export/fieldMappingProfiles';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';

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
        FieldMappingProfiles.goTofieldMappingProfilesTab();
        ExportNewFieldMappingProfile.createFieldMappingProfile(fieldMappingProfileName, 'Item');
        FieldMappingProfiles.verifySearchAndFilterPane();
        FieldMappingProfiles.searchText('text');
        FieldMappingProfiles.verifySearchResultIncludes(['text']);
        FieldMappingProfiles.clickResetAll();
        FieldMappingProfiles.searchText('TEXT');
        FieldMappingProfiles.verifySearchResultIncludes(['text']);

        FieldMappingProfiles.uncheckHoldingsRecordTypeChechbox();
        FieldMappingProfiles.uncheckInstanceRecordTypeChechbox();
        FieldMappingProfiles.verifySearchResultIncludes(['Item']);
        FieldMappingProfiles.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);

        FieldMappingProfiles.uncheckItemRecordTypeChechbox();
        FieldMappingProfiles.checkInstanceRecordTypeChechbox();
        FieldMappingProfiles.checkHoldingsRecordTypeChechbox();
        FieldMappingProfiles.verifySearchResultIncludes(['Holdings', 'Instance']);
        FieldMappingProfiles.verifySearchResultDoesNotInclude(['Item']);
        FieldMappingProfiles.clickResetAll();

        FieldMappingProfiles.clickNthCheckbox();
        FieldMappingProfiles.verifyTotalSelected('1');

        FieldMappingProfiles.uncheckUnselectedStatusChechbox();
        FieldMappingProfiles.checkUnselectedStatusChechbox();
        FieldMappingProfiles.uncheckSelectedStatusChechbox();
        FieldMappingProfiles.checkSelectedStatusChechbox();

        FieldMappingProfiles.clickNthCheckbox();
        FieldMappingProfiles.verifyTotalSelected('0');

        FieldMappingProfiles.uncheckHoldingsRecordTypeChechbox();
        FieldMappingProfiles.uncheckInstanceRecordTypeChechbox();
        FieldMappingProfiles.verifySearchResultIncludes(['Item']);
        FieldMappingProfiles.verifySearchResultDoesNotInclude(['Holdings', 'Instance']);
        FieldMappingProfiles.clickNthCheckbox();


        FieldMappingProfiles.fillInTransformationsTextfields('456', '1', '2', '$a');
        FieldMappingProfiles.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);

        FieldMappingProfiles.clickNewFieldMappingProfileSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);
    });
});
