import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const marcFileName = 'marcBibFileForC367988.mrc';
    const uploadedFileName = `C367988 autotestFile${getRandomPostfix()}.mrc`;
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

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser?.userId);
      InventoryInstances.deleteInstanceByTitleViaApi('C367988_');
    });

    it(
      'C367988 Check that "Run" button is disabled after clicking it one time (promin)',
      { tags: ['extendedPath', 'promin', 'C367988'] },
      () => {
        // Step 1: Upload file; verify redirected to Choose jobs page
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        DataImport.verifyFileIsImported(uploadedFileName);

        // Step 2: Select job profile; open run modal; verify modal content
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);
        JobProfiles.openRunJobModal();
        JobProfiles.verifyRunJobModal(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);

        // Step 3: Click Run; verify button disabled; verify import runs; verify redirect to landing page
        JobProfiles.clickRunInRunJobModal();
        JobProfiles.verifyRunButtonDisabledInRunJobModal();
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);
      },
    );
  });
});
