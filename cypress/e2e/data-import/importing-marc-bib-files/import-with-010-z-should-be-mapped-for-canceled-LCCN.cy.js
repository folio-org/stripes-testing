import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Logs from '../../../support/fragments/data_import/logs/logs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    let instanceHrid;
    const resourceIdentifier = {
      type: 'Canceled LCCN',
      value: '70100621',
    };
    const filePathForUpload = 'marcBibFileForC468223.mrc';
    const marcFileName = `C468223 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileName = 'Default - Create instance and SRS MARC Bib';

    before('Login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
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
      'C468223 Import of file with 010$z should be mapped for canceled LCCN (promin)',
      { tags: ['edgeCases', 'promin', 'C468223'] },
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

        // // Step 5: Verify that the resource identifier is displayed correctly in the instance view
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifier.type,
          resourceIdentifier.value,
          0,
        );
      },
    );
  });
});
