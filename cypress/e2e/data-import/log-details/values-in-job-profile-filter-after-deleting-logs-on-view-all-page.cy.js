import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';
import {
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  MATERIAL_TYPE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const filePath = 'oneMarcBib.mrc';
    const fileName = `C358534 autotestFile.${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C358534 instance mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C358534 instance action profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C358534 job profile ${getRandomPostfix()}`,
    };

    before('create user and login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });

      // create mapping profile
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.save();

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    it(
      'C358534 Check the values in the Job profile filter after deleting the logs on the View all page (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.filterJobsByJobProfile(jobProfile.profileName);
        LogsViewAll.checkByJobProfileName(jobProfile.profileName);
        DataImport.selectAllLogs();
        DataImport.openActionsMenu();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
      },
    );
  });
});
