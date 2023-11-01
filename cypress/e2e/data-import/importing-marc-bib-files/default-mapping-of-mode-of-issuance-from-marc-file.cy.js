import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const instanceHrids = [];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC11121.mrc';
    const fileName = `C11121 autotestFile${getRandomPostfix()}.mrc`;

    before('login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.wrap(instanceHrids).each((hrid) => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C11121 Check the default mapping of Mode of issuance from the MARC record to the Inventory Instance record (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        cy.wrap([
          {
            rowNumber: 0,
            modeOfIssuance: 'single unit',
          },
          {
            rowNumber: 1,
            modeOfIssuance: 'serial',
          },
          {
            rowNumber: 2,
            modeOfIssuance: 'single unit',
          },
        ]).each((instanceData) => {
          FileDetails.openInstanceInInventory('Created', instanceData.rowNumber);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrids.push(initialInstanceHrId);
          });
          InstanceRecordView.verifyModeOfIssuance(instanceData.modeOfIssuance);
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(fileName);
        });
      },
    );
  });
});
