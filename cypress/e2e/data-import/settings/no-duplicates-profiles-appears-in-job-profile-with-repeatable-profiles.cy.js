import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  EXISTING_RECORDS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `Update instance.${getRandomPostfix()}`,
          catalogedDate: '###TODAY###',
          statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          administrativeNote: 'Updated via OCLC match',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `Update instance via OCLC number match.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Update holdings temp location.${getRandomPostfix()}`,
          adminNote: 'Updated via OCLC number match',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Update holdings via OCLC number match.${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `035$a to OCLC.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '035',
            in1: '',
            in2: '',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.identifierOCLC,
        },
      },
      {
        matchProfile: {
          profileName: `035$z to OCLC.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '035',
            in1: '',
            in2: '',
            subfield: 'z',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.identifierOCLC,
        },
      },
      {
        matchProfile: {
          profileName: `Instance Status Batch Loaded.${getRandomPostfix()}`,
          incomingStaticValue: 'Batch Loaded',
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          existingRecordOption: NewMatchProfile.optionsList.instanceStatusTerm,
        },
      },
      {
        matchProfile: {
          profileName: `Holdings type electronic.${getRandomPostfix()}`,
          incomingStaticValue: 'Electronic',
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          existingRecordOption: NewMatchProfile.optionsList.holdingsType,
        },
      },
    ];

    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);

        // create Field mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.fillCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDate,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statusTerm,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.administrativeNote,
          9,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.adminNote,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        cy.wrap(collectionOfMappingAndActionProfiles).each((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // craete match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );

        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );

        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[2].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );

        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[3].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
    });

    it(
      'C385653 Verify that no duplicates of match and actions profiles appear after editing job profile with repeatable profiles (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const linkedProfileNames = [
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMatchProfiles[3].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMatchProfiles[3].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        ];
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `Import job profile with the same match and action profiles.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };
        const calloutMessage = `The job profile "${jobProfile.profileName}" was successfully updated`;

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.linkMatchProfileForNonMatches(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          5,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          5,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
          5,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          5,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          5,
        );
        NewJobProfile.saveAndClose();

        JobProfiles.search(jobProfile.profileName);
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile.profileName);
        JobProfileEdit.unlinkProfile(1);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyCalloutMessage(calloutMessage);
        JobProfileView.verifyLinkedProfiles(linkedProfileNames, linkedProfileNames.length);

        JobProfiles.deleteJobProfile(jobProfile.profileName);
      },
    );

    it(
      'C385629 Verify that no duplicates of match and actions profiles appear after saving job profile with repeatable match/action profiles (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const linkedProfileNames = [
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMatchProfiles[3].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMatchProfiles[3].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        ];
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `Import job profile with the same match and action profiles.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.linkMatchProfileForNonMatches(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          5,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          5,
        );
        NewJobProfile.waitLoading();
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[3].matchProfile.profileName,
          5,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          5,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          5,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        JobProfileView.verifyLinkedProfiles(linkedProfileNames, linkedProfileNames.length);

        JobProfiles.deleteJobProfile(jobProfile.profileName);
      },
    );
  });
});
