import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
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
    let user;
    let instanceId;
    const numberOfLogsToDelete = '1';
    const filePath = 'oneMarcBib.mrc';
    const fileName = `C358534 autotestFile${getRandomPostfix()}.mrc`;
    const mappingProfileName = `C358534 instance mapping profile ${getRandomPostfix()}`;
    const actionProfileName = `C358534 instance action profile ${getRandomPostfix()}`;
    const jobProfileName = `C358534 job profile ${getRandomPostfix()}`;

    before('create user and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileViaApi(mappingProfileName).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfileName,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfileName,
              actionProfileResponse.body.id,
            );
          });
        },
      );
      DataImport.uploadFileViaApi(filePath, fileName, jobProfileName).then((response) => {
        instanceId = response[0].instance.id;
      });

      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C358534 Check the values in the Job profile filter after deleting the logs on the View all page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.filterJobsByJobProfile(jobProfileName);
        LogsViewAll.checkByJobProfileName(jobProfileName);
        DataImport.selectAllLogs();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(
          `${numberOfLogsToDelete} data import logs have been successfully deleted.`,
        );
        LogsViewAll.verifyJobProfileIsAbsntInFilter(jobProfileName);
      },
    );
  });
});
