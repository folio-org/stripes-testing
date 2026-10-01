import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const profileName = 'Default - Delete MARC Authority records';
      const profileDescription =
        'This action profile is used to delete MARC authority records. This action profile cannot be duplicated, edited, or deleted.';
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];
      const capabsToAssign = [Capabilities.settingsEnabled];
      const disabledOptions = ['Edit', 'Duplicate', 'Delete'];
      const conditionsToCheck = [
        { label: 'Name', conditions: { value: profileName } },
        { label: 'Description', conditions: { value: profileDescription } },
        { label: 'Action', conditions: { value: 'Delete' } },
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
            path: SettingsMenu.actionProfilePath,
            waiter: ActionProfiles.waitLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453722 "Default - Delete MARC Authority records" action profile is visible in the list, shows correct fields, and Edit/Duplicate/Delete actions are disabled (promin)',
        { tags: ['criticalPath', 'promin', 'C1453722'] },
        () => {
          // Step 1: Verify "Default - Delete MARC Authority records" is present in the list
          ActionProfiles.search(profileName);
          ActionProfiles.verifySearchResult(profileName);

          // Step 2: Open profile and verify Name, Description, Action, FOLIO record type, and associated profiles
          ActionProfiles.selectActionProfileFromList(profileName);
          ActionProfileView.verifyActionProfileOpened();
          ActionProfileView.checkSummaryFieldsConditions(conditionsToCheck);
          ActionProfileView.verifyLinkedFieldMappingProfile(profileName);
          ActionProfileView.verifyLinkedJobProfile(profileName);

          // Step 3: Click Actions; verify Edit, Duplicate, Delete are disabled
          ActionProfileView.verifyActionsMenuOptionsDisabled(disabledOptions);
        },
      );
    });
  });
});
