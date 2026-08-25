import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const profileName = 'Default - Delete MARC Authority records';
      const profileDescription =
        'This mapping profile is used to delete MARC authority records. This mapping profile cannot be duplicated, edited, or deleted.';
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];
      const capabsToAssign = [Capabilities.settingsEnabled];
      // TO DO: Uncomment step after https://folio-org.atlassian.net/browse/UIDATIMP-1775 is done
      // const disabledOptions = [
      //   'Edit',
      //   'Duplicate',
      //   'Delete',
      // ];
      const conditionsToCheck = [
        { label: 'Name', conditions: { value: profileName } },
        { label: 'Description', conditions: { value: profileDescription } },
        { label: 'Incoming record type', conditions: { value: 'MARC Authority' } },
        { label: 'FOLIO record type', conditions: { value: 'MARC Authority' } },
      ];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453723 "Default - Delete MARC Authority records" field mapping profile is visible in the list, shows correct fields, and Edit/Duplicate/Delete actions are disabled (promin)',
        { tags: ['criticalPath', 'promin', 'C1453723'] },
        () => {
          // Step 1: Verify "Default - Delete MARC Authority records" is present in the list
          FieldMappingProfiles.search(profileName);
          FieldMappingProfiles.verifySearchResult(profileName);

          // Step 2: Open profile and verify Name, Description, record types, and associated action profile
          FieldMappingProfiles.selectMappingProfileFromList(profileName);
          FieldMappingProfileView.verifyMappingProfileOpened();
          FieldMappingProfileView.checkSummaryFieldsConditions(conditionsToCheck);
          FieldMappingProfileView.verifyLinkedActionProfile(profileName);

          // TO DO: Uncomment step after https://folio-org.atlassian.net/browse/UIDATIMP-1775 is done
          // Step 3: Click Actions; verify Edit, Duplicate, Delete are disabled
          // FieldMappingProfileView.verifyActionsMenuOptionsDisabled(disabledOptions);
        },
      );
    });
  });
});
