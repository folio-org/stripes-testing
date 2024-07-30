import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
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
    let user;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C385654 Update instance.${getRandomPostfix()}`,
          catalogedDate: '###TODAY###',
          statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          administrativeNote: 'Updated via OCLC match',
        },
        actionProfile: {
          name: `C385654 Update instance via OCLC number match.${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C385654 Update holdings temp location.${getRandomPostfix()}`,
          adminNote: 'Updated via OCLC number match',
        },
        actionProfile: {
          name: `C385654 Update holdings via OCLC number match.${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: 'HOLDINGS',
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C385654 035$a to OCLC.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '035',
            in1: '',
            in2: '',
            subfield: 'a',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.identifierOCLC,
        },
      },
      {
        matchProfile: {
          profileName: `C385654 035$z to OCLC.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '035',
            in1: '',
            in2: '',
            subfield: 'z',
          },
          matchCriterion: 'Exactly matches',
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.identifierOCLC,
        },
      },
      {
        matchProfile: {
          profileName: `C385654 Instance Status Batch Loaded.${getRandomPostfix()}`,
          incomingStaticValue: 'Batch Loaded',
          incomingStaticRecordValue: 'Text',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          existingRecordOption: 'instance.statusId',
        },
      },
      {
        matchProfile: {
          profileName: `C385654 Holdings type electronic.${getRandomPostfix()}`,
          incomingStaticValue: 'Electronic',
          incomingStaticRecordValue: 'Text',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingRecordOption: 'holdingsrecord.holdingsTypeId',
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `Import job profile with the same match and action profiles.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const jobProfileNameForChanging = `C385654 Import job profile with the same match and action profiles.${getRandomPostfix()}`;
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

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileForUpdateViaApi(
        collectionOfMappingAndActionProfiles[0].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfMappingAndActionProfiles[0].actionProfile,
          mappingProfileResponse.body.id,
        );
      });
      NewFieldMappingProfile.createHoldingsMappingProfileForUpdateViaApi(
        collectionOfMappingAndActionProfiles[1].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfMappingAndActionProfiles[1].actionProfile,
          mappingProfileResponse.body.id,
        );
      });
      NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi(
        collectionOfMatchProfiles[0].matchProfile,
      );
      NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi(
        collectionOfMatchProfiles[1].matchProfile,
      );
      NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi(
        collectionOfMatchProfiles[2].matchProfile,
      );
      NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi(
        collectionOfMatchProfiles[3].matchProfile,
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileNameForChanging);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C385654 Verify that no duplicates of match and actions profiles appear after duplicating job profile with repeatable profiles (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        const calloutMessage = `The job profile "${jobProfileNameForChanging}" was successfully created`;

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
        cy.wait(2000);
        NewJobProfile.saveAndClose();
        cy.wait(2000);
        JobProfileView.duplicate();
        NewJobProfile.unlinkProfile(1);
        NewJobProfile.fillProfileName(jobProfileNameForChanging);
        NewJobProfile.saveAndClose();
        JobProfileView.verifyCalloutMessage(calloutMessage);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(jobProfileNameForChanging);
        cy.wait(3000);
        JobProfileView.verifyLinkedProfiles(linkedProfileNames, linkedProfileNames.length);
      },
    );
  });
});
