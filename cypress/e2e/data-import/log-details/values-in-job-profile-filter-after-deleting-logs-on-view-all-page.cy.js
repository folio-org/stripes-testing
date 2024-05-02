import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const testData = {
      numberOfLogsToDelete: '1',
      filePath: 'oneMarcBib.mrc',
      fileName: `C358534 autotestFile${getRandomPostfix()}.mrc`,
      mappingProfileName: `C358534 instance mapping profile ${getRandomPostfix()}`,
      actionProfileName: `C358534 instance action profile ${getRandomPostfix()}`,
      jobProfileName: `C358534 job profile ${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileViaApi(testData.mappingProfileName).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            testData.actionProfileName,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              testData.jobProfileName,
              actionProfileResponse.body.id,
            );
          });
        },
      );
      DataImport.uploadFileViaApi(
        testData.filePath,
        testData.fileName,
        testData.jobProfileName,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfileName);

        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C358534 Check the values in the Job profile filter after deleting the logs on the View all page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.filterJobsByJobProfile(testData.jobProfileName);
        LogsViewAll.checkByJobProfileName(testData.jobProfileName);
        DataImport.selectAllLogs();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(
          `${testData.numberOfLogsToDelete} data import logs have been successfully deleted.`,
        );
        LogsViewAll.verifyJobProfileIsAbsntInFilter(testData.jobProfileName);
      },
    );
  });
});
