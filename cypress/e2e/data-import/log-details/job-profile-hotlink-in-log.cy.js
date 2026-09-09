import {
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  EXISTING_RECORD_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView, {
  deletedCalloutMessage,
} from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    const mappingProfile = {
      name: `AT_C380634_MappingProfile_${randomPostfix}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const actionProfile = {
      name: `AT_C380634_ActionProfile_${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const jobProfile = { profileName: `AT_C380634_JobProfile_${randomPostfix}` };
    const importedFileName = `AT_C380634_importedFile_${randomPostfix}.mrc`;

    let user;
    let jobProfileId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        // Create a non-default MARC Bib "Create Instance" job profile (must be deletable)
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              actionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                jobProfile.profileName,
                actionProfileResponse.body.id,
              ).then((createdJobProfileId) => {
                jobProfileId = createdJobProfileId;
              });
            });
          },
        );
      })
        .then(() => {
          // Import a generic MARC Bib record using the created job profile
          DataImport.uploadFileViaApi('oneMarcBib.mrc', importedFileName, jobProfile.profileName);
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.settingsDataImportEnabled.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C380634 DI Landing page: Verify that job profile name in log is a hotlink to the job profile details (promin)',
      { tags: ['extendedPath', 'promin', 'C380634'] },
      () => {
        // Steps 1-3: Click the job profile hotlink - job profile details view opens in the 4th pane
        Logs.openJobProfile(jobProfile.profileName);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(jobProfile.profileName);

        // Step 4: Delete the job profile - no longer present in the job profiles list
        JobProfileView.delete();
        JobProfileView.verifyCalloutMessage(deletedCalloutMessage(jobProfile.profileName));
        JobProfiles.verifyJobProfileShownInList(jobProfile.profileName, false);

        // Step 5: Intercept the job profile request (stand-in for inspecting the Network tab)
        cy.intercept('GET', `**/data-import-profiles/jobProfiles/${jobProfileId}*`).as(
          'getDeletedJobProfile',
        );

        // Step 6: Repeat steps 1-3 - same hotlink text, but the pane now shows the deleted state, and 404s
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
        Logs.openJobProfile(jobProfile.profileName);
        cy.wait('@getDeletedJobProfile').its('response.statusCode').should('eq', 404);
        JobProfileView.verifyDeletedProfileView();
      },
    );
  });
});
