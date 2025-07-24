import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
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
    const mappingProfile = {
      name: `C358534 instance mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C358534 instance action profile ${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      name: `C358534 job profile ${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile.name,
              actionProfileResponse.body.id,
            );
          });
        },
      );

      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        // upload a marc file for creating of the new instance
        DataImport.uploadFileViaApi(filePath, fileName, jobProfile.name).then((response) => {
          instanceId = response[0].instance.id;
        });

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C358534 Check the values in the Job profile filter after deleting the logs on the View all page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C358534'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.filterJobsByJobProfile(jobProfile.name);
        cy.wait(1500);
        LogsViewAll.checkByJobProfileName(jobProfile.name);
        DataImport.selectAllLogs();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(
          `${numberOfLogsToDelete} data import logs have been successfully deleted.`,
        );
        LogsViewAll.verifyJobProfileIsAbsntInFilter(jobProfile.name);
      },
    );
  });
});
