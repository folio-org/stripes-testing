import {
  ACCEPTED_DATA_TYPE_NAMES,
  DEFAULT_ACTION_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
} from '../../../support/constants';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const postfix = getRandomPostfix();
    const deleteAuthorityProfileName = DEFAULT_ACTION_PROFILE_NAMES.DELETE_AUTHORITY;

    const updateAuthMappingProfile = { name: `AT_C1453729_UpdateAuthMappingProfile_${postfix}` };
    const updateAuthActionProfile = {
      name: `AT_C1453729_UpdateAuthActionProfile_${postfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const marcAuthMatchProfile = {
      profileName: `AT_C1453729_MatchProfile_AuthToAuth_${postfix}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const nonMarcAuthMatchProfile = {
      profileName: `AT_C1453729_MatchProfile_BibToBib_${postfix}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C1453729_JobProfile_${postfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const mustBeInForMatchesBranchSuffix =
      'Delete MARC-AUTHORITY action profile must be placed in the for-matches branch of a match profile for MARC-AUTHORITY to MARC-AUTHORITY matching';
    const cannotBeNextToOtherActionsSuffix =
      'Delete MARC-AUTHORITY action profile cannot be placed next to other action profiles in the for-matches branch';

    let user;

    // Repeats TestRail steps 1-11: builds up (and tears down) invalid Delete-MARC-Authority
    // action placements one at a time, checking the exact rejection error each time, and
    // finally lands on the one valid configuration that gets saved successfully.
    // On the New job profile form the rejection prefix is "New record not created:"; on the
    // Edit job profile form (step 13's repeat) it is "Record not updated:" instead
    const buildAndValidateDeleteAuthorityPlacement = (isEdit = false) => {
      const prefix = isEdit ? 'Record not updated' : 'New record not created';
      const errorMustBeInForMatchesBranch = `${prefix}: ${mustBeInForMatchesBranchSuffix}`;
      const errorCannotBeNextToOtherActions = `${prefix}: ${cannotBeNextToOtherActionsSuffix}`;

      // Step 1: add the Delete action directly to the Overview, with no match profile
      NewJobProfile.linkActionProfileByName(deleteAuthorityProfileName);

      // Step 2: rejected - Delete action must sit in a match profile's for-matches branch
      NewJobProfile.saveAndClose(false);
      NewJobProfile.checkCalloutMessage(errorMustBeInForMatchesBranch);

      // Step 3: remove the top-level Delete action; add MARC Authority match profile and the
      // non-Delete "Update MARC authority" action in its for-matches branch
      JobProfileEdit.unlinkActionProfile(0);
      NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
      NewJobProfile.linkMatchProfile(marcAuthMatchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(updateAuthActionProfile.name, 0);
      NewJobProfile.verifyRootAddButtonDisplayed(true);
      NewJobProfile.verifyMatchBranchAddButtonsCount(2);

      // Step 4: add the Delete action into the SAME for-matches branch, next to "Update"
      NewJobProfile.linkActionProfileForMatches(deleteAuthorityProfileName, 0);
      NewJobProfile.verifyRootAddButtonDisplayed(false);
      NewJobProfile.verifyMatchBranchAddButtonsCount(0);
      NewJobProfile.verifyForNonMatchesSectionDisplayed(false);

      // Step 5: rejected - Delete action cannot sit next to another action in for-matches
      NewJobProfile.saveAndClose(false);
      NewJobProfile.checkCalloutMessage(errorCannotBeNextToOtherActions);

      // Step 6: remove the Delete action from for-matches (added 2nd, so index 1), keep
      // "Update" in for-matches, add the Delete action to the for-non-matches branch instead
      JobProfileEdit.unlinkForMatchActionsProfile(1);
      NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
      NewJobProfile.linkActionProfileForNonMatches(deleteAuthorityProfileName, 1);

      // Step 7: rejected - Delete action must sit in the for-matches branch, not for-non-matches
      NewJobProfile.saveAndClose(false);
      NewJobProfile.checkCalloutMessage(errorMustBeInForMatchesBranch);

      // Step 8: remove "Update" from for-matches and Delete from for-non-matches; add Delete
      // alone into for-matches
      JobProfileEdit.unlinkForMatchActionsProfile(0);
      NewJobProfile.verifyProfileAbsentFromOverview(updateAuthActionProfile.name);
      JobProfileEdit.unlinkForNonMatchActionsProfile(0);
      NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
      NewJobProfile.linkActionProfileForMatches(deleteAuthorityProfileName, 0);
      NewJobProfile.verifyRootAddButtonDisplayed(false);
      NewJobProfile.verifyMatchBranchAddButtonsCount(0);
      NewJobProfile.verifyForNonMatchesSectionDisplayed(false);

      // Step 9: replace the MARC Authority match profile with a non-MARC-Authority one; add the
      // Delete action into its for-matches branch again
      JobProfileEdit.unlinkActionProfile(0);
      // Removing the top-level match profile should cascade-remove its nested Delete action too
      NewJobProfile.verifyProfileAbsentFromOverview(marcAuthMatchProfile.profileName);
      NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
      NewJobProfile.linkMatchProfile(nonMarcAuthMatchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(deleteAuthorityProfileName, 0);

      // Step 10: rejected - match profile is not MARC-AUTHORITY to MARC-AUTHORITY
      NewJobProfile.saveAndClose(false);
      NewJobProfile.checkCalloutMessage(errorMustBeInForMatchesBranch);

      // Step 11: replace back with the MARC Authority match profile, re-add Delete in
      // for-matches - this is the one valid configuration, save succeeds
      JobProfileEdit.unlinkActionProfile(0);
      NewJobProfile.verifyProfileAbsentFromOverview(nonMarcAuthMatchProfile.profileName);
      NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
      NewJobProfile.linkMatchProfile(marcAuthMatchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(deleteAuthorityProfileName, 0);
      NewJobProfile.saveAndClose();
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(
        updateAuthMappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          updateAuthActionProfile,
          mappingProfileResponse.body.id,
        );
      });
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(marcAuthMatchProfile);
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
        nonMarcAuthMatchProfile,
      );

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [Capabilities.settingsEnabled],
          [CapabilitySets.uiDataImportSettingsManage],
        );

        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(marcAuthMatchProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(nonMarcAuthMatchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(updateAuthActionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(updateAuthMappingProfile.name);
    });

    it(
      'C1453729 Job profile creation is rejected when Delete MARC Authority action is placed in invalid configurations (promin)',
      { tags: ['criticalPath', 'promin', 'C1453729'] },
      () => {
        // Steps 1-11: New job profile form
        JobProfiles.createJobProfile(jobProfile);
        buildAndValidateDeleteAuthorityPlacement();
        JobProfiles.waitLoadingList();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // Step 12: open the created profile, Actions > Edit
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyLinkedProfilesForMatches([deleteAuthorityProfileName], 1);
        JobProfileView.edit();
        NewJobProfile.verifyRootAddButtonDisplayed(false);
        NewJobProfile.verifyMatchBranchAddButtonsCount(0);
        NewJobProfile.verifyForNonMatchesSectionDisplayed(false);

        // Step 13: repeat steps 1-11 on the Edit form - first remove the existing MARC Authority
        // match profile (and its Delete action) to get back to an empty Overview
        JobProfileEdit.unlinkActionProfile(0);
        NewJobProfile.verifyProfileAbsentFromOverview(marcAuthMatchProfile.profileName);
        NewJobProfile.verifyProfileAbsentFromOverview(deleteAuthorityProfileName);
        buildAndValidateDeleteAuthorityPlacement(true);
      },
    );
  });
});
