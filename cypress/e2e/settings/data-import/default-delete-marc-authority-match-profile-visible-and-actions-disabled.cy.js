import CapabilitySets from '../../../support/dictionary/capabilitySets';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  COMMON_BUTTON_LABELS,
} from '../../../support/constants/constants';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const profileName = 'Default - Delete MARC Authority records';
      const profileDescription =
        'This match profile is used to delete MARC authority records. The default field is set to 999 ff $s. This match profile cannot be deleted, but it can edited or duplicated.';
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];
      const disabledOptions = [COMMON_BUTTON_LABELS.DELETE];
      const enabledOptions = [COMMON_BUTTON_LABELS.EDIT, COMMON_BUTTON_LABELS.DUPLICATE];
      const conditionsToCheck = [
        { label: 'Name', conditions: { value: profileName } },
        { label: 'Description', conditions: { value: profileDescription } },
      ];
      const mappingDetailsToCheck = [
        {
          profileName,
          incomingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          existingRecordFields: {
            field: '999',
            in1: 'f',
            in2: 'f',
            subfield: 's',
          },
          existingRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
        },
        FOLIO_RECORD_TYPE.MARCAUTHORITY,
      ];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.matchProfilePath,
            waiter: MatchProfiles.waitLoading,
          });
          MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453725 "Default - Delete MARC Authority records" match profile is visible in the list, shows correct fields, and Delete action is disabled (promin)',
        { tags: ['criticalPath', 'promin', 'C1453725'] },
        () => {
          // Step 1: Verify "Default - Delete MARC Authority records" is present in the list
          MatchProfiles.search(profileName);
          MatchProfiles.verifySearchResult(profileName);

          // Step 2: Open profile and verify Name, Description, and match criteria
          MatchProfiles.selectMatchProfileFromList(profileName);
          MatchProfileView.verifyMatchProfileOpened();
          MatchProfileView.checkSummaryFieldsConditions(conditionsToCheck);
          MatchProfileView.verifyMatchProfileWithIncomingAndExistingValue(...mappingDetailsToCheck);

          // Step 3: Click Actions; verify Delete is disabled, Edit and Duplicate are enabled
          MatchProfileView.verifyActionsMenuOptionsDisabled(disabledOptions);
          MatchProfileView.verifyActionsMenuOptionsDisabled(enabledOptions, {
            isDisabled: false,
            openMenu: false,
          });
        },
      );
    });
  });
});
