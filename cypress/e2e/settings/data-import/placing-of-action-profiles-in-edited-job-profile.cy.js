import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfActionAndMappingProfiles = [
      {
        mappingProfile: {
          name: `C423385 mapping profile1${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C423385 action profile1${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        mappingProfile: {
          name: `C423385 mapping profile2${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C423385 action profile2${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
    ];
    const matchProfileName = `C423385 match profile ${getRandomPostfix()}`;
    const jobProfile = {
      profileName: `C423385 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const calloutMessage = `The job profile "${jobProfile.profileName}" was successfully updated`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileViaApi(
        collectionOfActionAndMappingProfiles[0].mappingProfile.name,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApiMarc(
          collectionOfActionAndMappingProfiles[0].actionProfile,
          mappingProfileResponse.body.id,
        );
      });
      NewFieldMappingProfile.createMappingProfileViaApi(
        collectionOfActionAndMappingProfiles[1].mappingProfile.name,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApiMarc(
          collectionOfActionAndMappingProfiles[1].actionProfile,
          mappingProfileResponse.body.id,
        );
      });
      NewMatchProfile.createMatchProfileViaApi(matchProfileName);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
        collectionOfActionAndMappingProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C423385 Check the placing of action profiles in edited Job profile (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfActionAndMappingProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForNonMatches(
          collectionOfActionAndMappingProfiles[1].actionProfile.name,
        );
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyLinkedProfiles(
          [
            matchProfileName,
            collectionOfActionAndMappingProfiles[0].actionProfile.name,
            collectionOfActionAndMappingProfiles[1].actionProfile.name,
          ],
          3,
        );
        JobProfileView.edit();
        JobProfileEdit.unlinkForMatchActionsProfile(0);
        JobProfileEdit.unlinkForNonMatchActionsProfile(0);
        JobProfileEdit.linkActionProfileForMatches(
          collectionOfActionAndMappingProfiles[1].actionProfile.name,
        );
        JobProfileEdit.linkActionProfileForNonMatches(
          collectionOfActionAndMappingProfiles[0].actionProfile.name,
        );
        // wait for the action profile to be linked
        cy.wait(1000);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles(
          [
            matchProfileName,
            collectionOfActionAndMappingProfiles[1].actionProfile.name,
            collectionOfActionAndMappingProfiles[0].actionProfile.name,
          ],
          3,
        );
        JobProfileView.verifyCalloutMessage(calloutMessage);
      },
    );
  });
});
