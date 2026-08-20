import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Logs from '../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    let instanceHrid;
    const field035a = '(OCoLC)123456';
    const filePathForUpload = 'marcBibFileForC466252.mrc';
    const marcFileName = `C466252 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileName = 'Default - Create instance and SRS MARC Bib';

    before('Login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C466252 Import of file with 035 OCLC field with prefix and leading zeros (promin)',
      { tags: ['edgeCases', 'promin', 'C466252'] },
      () => {
        // Step 1-2: Upload MARC Bib file and run job profile
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();

        // Step 3: Verify that the file was imported successfully and instance was created
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        Logs.verifyInstanceStatus();

        // Step 4: Open the created instance
        Logs.clickOnHotLink();
        InstanceRecordView.waitLoading();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });

        // Step 5: Verify that the 035 field is displayed correctly in the instance record view
        InstanceRecordView.verifyResourceIdentifier('OCLC', field035a, 3);

        // Step 6: Verify that the 035 field is displayed correctly in the MARC Bib source view
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('035', `\t035\t   \t$a ${field035a}`);

        // Step 7: Verify that the 035 field is displayed correctly in the QuickMarc Editor
        InventoryViewSource.editMarcBibRecord();
        QuickMarcEditor.checkContent(`$a ${field035a}`, 7);
      },
    );
  });
});
