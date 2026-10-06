import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/jobProfiles/jobProfiles';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let mappingProfileId;
let actionProfileId;
let matchProfileId;

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const mappingProfileName = `AT_C17158_MappingProfile_${randomPostfix}`;
    const actionProfileName = `AT_C17158_ActionProfile_${randomPostfix}`;
    const matchProfileName = `AT_C17158_MatchProfile_${randomPostfix}`;
    const jobProfileName = `AT_C17158_JobProfile_${randomPostfix}`;

    before('Create mapping/action/match/job profiles and user', () => {
      cy.getAdminToken();

      // An action profile can only be linked into a job profile once it has its own linked field
      // mapping profile (confirmed via UI - the app rejects a job profile whose action profile
      // has no mapping profile), so create that chain first
      NewFieldMappingProfile.createInstanceMappingProfileViaApi({ name: mappingProfileName })
        .then((mappingProfileResponse) => {
          mappingProfileId = mappingProfileResponse.body.id;
          return NewActionProfile.createActionProfileViaApi(
            {
              name: actionProfileName,
              action: 'CREATE',
              folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
            },
            mappingProfileId,
          );
        })
        .then((actionProfileResponse) => {
          actionProfileId = actionProfileResponse.body.id;
          return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
            profileName: matchProfileName,
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
            recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          });
        })
        .then((matchProfileResponse) => {
          matchProfileId = matchProfileResponse.body.id;
          // Job profile linked to the match profile, which in turn (on match) links to the
          // action profile - the exact "action profile linked to a job profile under a match
          // profile" setup
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfileName,
            matchProfileId,
            actionProfileId,
          );
        });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.actionProfilePath,
          waiter: ActionProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      ActionProfiles.deleteActionProfileByNameViaApi(actionProfileName);
      MatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
    });

    it(
      'C17158 When viewing an action profile that is linked to a job profile under a match profile, the action profile detail view does not show its job profile (promin)',
      { tags: ['extendedPath', 'promin', 'C17158'] },
      () => {
        // Steps 1-2: setup already done via API - navigate to our action profile
        ActionProfiles.search(actionProfileName);
        ActionProfiles.verifySearchResult(actionProfileName);

        // Step 3: open the action profile detail view
        ActionProfiles.selectActionProfileFromList(actionProfileName);
        ActionProfileView.verifyActionProfileOpened();

        // Step 4: scroll to "Associated job profiles" - the linked job profile is shown
        ActionProfileView.verifyLinkedJobProfile(jobProfileName);
      },
    );
  });
});
