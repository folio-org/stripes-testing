import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const marcFileName = 'marcBibFileForC282197.mrc';
    const uploadedFileName = `C282197 autotestFile${getRandomPostfix()}.mrc`;
    const instanceTitle = 'AT_C282197_MarcBibInstance';
    let testUser;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testUser = userProperties;
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      InventoryInstances.deleteInstanceByTitleViaApi('C282197_');
    });

    it(
      'C282197 Data Import log displays error message when trying to view record JSON details (promin)',
      { tags: ['extendedPath', 'promin', 'C282197'] },
      () => {
        // Step 1: Upload file; verify redirected to Choose jobs page
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        DataImport.verifyFileIsImported(uploadedFileName);

        // Step 2: Select job profile, run import; verify redirect to landing page
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 3: Open file details; verify Completed status and Created records
        Logs.openFileDetails(uploadedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.instance,
        );

        // Step 4: Click Title hotlink; verify JSON screen opens with Incoming record tab and title content
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyIncomingRecordTabIsActive();
        JsonScreenView.verifyContentInTab(`"a": "${instanceTitle}"`);
      },
    );
  });
});
