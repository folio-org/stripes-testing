import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const instanceTitle = 'AT_C196799_MarcBibInstance';
    const marcFileName = 'marcBibFileForC196799.mrc';
    const uploadedFileName = `C196799 autotestFile${getRandomPostfix()}.mrc`;
    let testUser;

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testUser = userProperties;
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testUser?.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      });
    });

    it(
      'C196799 Import MARC record using the default job profile (promin)',
      { tags: ['extendedPath', 'promin', 'C196799'] },
      () => {
        const todaysDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        // Step 1: Open Data Import app — verify Jobs and Logs panes displayed
        DataImport.verifyUploadState();

        // Step 2: Upload MARC file — verify file name populates the Files pane
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        DataImport.checkFileUploadData(uploadedFileName, todaysDate);
        DataImport.verifyFileIsImported(uploadedFileName);

        // Step 3: Find and select Default - Create instance and SRS MARC Bib job profile
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);

        // Steps 4-5: Click Actions > Run in the job profile pane
        JobProfiles.runImportFile();

        // Steps 6-7: Wait for job to complete; verify Completed status in Logs
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(uploadedFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // Step 8: Navigate to Inventory; verify imported record is found
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkInstanceTitle(instanceTitle);

        // Step 9: Open Edit in quickMARC; verify the imported MARC record is visible
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkContentByTag('245', `$a ${instanceTitle}`);
      },
    );
  });
});
