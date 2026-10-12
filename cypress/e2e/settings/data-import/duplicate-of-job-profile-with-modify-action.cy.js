import { matching } from '../../../../interactors';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  PROFILE_TYPE_NAMES,
  DEFAULT_ACTION_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Notifications from '../../../support/fragments/settings/dataImport/notifications';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const postfix = getRandomPostfix();
    const defaultCreateInstanceActionName = DEFAULT_ACTION_PROFILE_NAMES.CREATE_INSTANCE;
    const testData = {
      mappingProfileName: `AT_C468275_ModifyMapping_${postfix}`,
      actionProfileName: `AT_C468275_ModifyAction_${postfix}`,
      matchProfileName: `AT_C468275_001Match_${postfix}`,
      jobProfileName: `AT_C468275_JobProfile_${postfix}`,
      duplicatedJobProfileName: `AT_C468275_JobProfile_Duplicated_${postfix}`,
      user: {},
    };

    before('Create test data via API, login', () => {
      cy.getAdminToken();

      // Field mapping profile: MARC Bib -> MARC Bib modification, Add 008$a "Test"
      const mappingProfileBody = {
        profile: {
          name: testData.mappingProfileName,
          description: '',
          incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          marcFieldProtectionSettings: [],
          mappingDetails: {
            name: 'marcBib',
            recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            mappingFields: [],
            marcMappingDetails: [
              {
                order: 0,
                action: 'ADD',
                field: {
                  field: '008',
                  subfields: [{ subfield: 'a', data: { text: 'Test' } }],
                },
              },
            ],
            marcMappingOption: 'MODIFY',
          },
        },
        addedRelations: [],
        deletedRelations: [],
      };

      cy.then(() => {
        SettingsFieldMappingProfiles.createMappingProfileViaApi(mappingProfileBody).then(
          ({ body: { id: mappingProfileId } }) => {
            NewActionProfile.createActionProfileViaApi(
              {
                name: testData.actionProfileName,
                action: 'MODIFY',
                folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              },
              mappingProfileId,
            ).then(({ body: { id: modifyActionProfileId } }) => {
              NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
                profileName: testData.matchProfileName,
                incomingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
                existingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
                recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              }).then((matchProfileResponse) => {
                const matchProfileId = matchProfileResponse.body.id;

                SettingsActionProfiles.getActionProfilesViaApi({
                  query: `name="${defaultCreateInstanceActionName}"`,
                }).then(({ actionProfiles }) => {
                  const defaultCreateInstanceActionId = actionProfiles[0].id;

                  // Job profile: 001-to-001 match -> (for matches) Default - Create instance,
                  // then Modify for testing (both chained off the same match, in order)
                  const jobProfileBody = {
                    profile: {
                      name: testData.jobProfileName,
                      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
                    },
                    addedRelations: [
                      {
                        masterProfileId: null,
                        masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
                        detailProfileId: matchProfileId,
                        detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                        order: 0,
                      },
                      {
                        masterProfileId: matchProfileId,
                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                        detailProfileId: defaultCreateInstanceActionId,
                        detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                        order: 0,
                        reactTo: 'MATCH',
                      },
                      {
                        masterProfileId: matchProfileId,
                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                        detailProfileId: modifyActionProfileId,
                        detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                        order: 1,
                        reactTo: 'MATCH',
                      },
                    ],
                    deletedRelations: [],
                  };

                  SettingsJobProfiles.createJobProfileViaApi(jobProfileBody);
                });
              });
            });
          },
        );
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.duplicatedJobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(testData.matchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfileName);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C468275 Duplicate of job profile with modify action (promin)',
      { tags: ['extendedPath', 'promin', 'C468275'] },
      () => {
        // Precondition: open the job profile created via API
        JobProfiles.select(testData.jobProfileName);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyLinkedProfiles(
          [testData.matchProfileName, defaultCreateInstanceActionName, testData.actionProfileName],
          3,
        );

        // Step 1: Actions -> Duplicate - "New job profile" pane opens with the same values;
        // "Save as profile & Close" is disabled since nothing has changed yet
        JobProfileView.duplicate();
        NewJobProfile.checkPreviouslyPopulatedDataIsDisplayed(
          { profileName: testData.jobProfileName, acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC },
          defaultCreateInstanceActionName,
        );
        JobProfileEdit.verifyLinkedProfiles([testData.matchProfileName], 1);
        JobProfileEdit.verifyLinkedProfilesForMatches(
          [defaultCreateInstanceActionName, testData.actionProfileName],
          2,
        );
        NewJobProfile.verifySaveAndCloseButtonDisabled(true);

        // Step 2: update the Name field, unlink "Modify for testing" action profile
        NewJobProfile.fillProfileName(testData.duplicatedJobProfileName);
        JobProfileEdit.unlinkForMatchActionsProfile(1);
        JobProfileEdit.verifyLinkedProfilesForMatches([defaultCreateInstanceActionName], 1);
        NewJobProfile.verifySaveAndCloseButtonDisabled(false);

        // Step 3: link "Modify for testing" back, under "Default - Create instance"
        NewJobProfile.linkActionProfileForMatches(testData.actionProfileName, 0);
        JobProfileEdit.verifyLinkedProfilesForMatches(
          [defaultCreateInstanceActionName, testData.actionProfileName],
          2,
        );

        // Step 4: Save & Close - success toast, detail view of the duplicated profile is shown
        // with the action profiles placed back in their designated places
        NewJobProfile.saveAndClose();
        InteractorsTools.checkCalloutMessage(
          matching(new RegExp(Notifications.jobProfileCreatedSuccessfully)),
        );
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(testData.duplicatedJobProfileName);
        JobProfileView.verifyLinkedProfiles(
          [testData.matchProfileName, defaultCreateInstanceActionName, testData.actionProfileName],
          3,
        );
      },
    );
  });
});
