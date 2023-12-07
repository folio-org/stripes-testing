import { JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const instanceHrids = [];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC6690.mrc';
    const fileName = `C6690 autotestFile${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        instanceHrids.forEach((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C6690 Check the default mapping of the Index title from the MARC record to the Inventory Instance Index title field (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        cy.wrap([
          {
            rowNumber: 0,
            resourceTitle: '2000 Philippine provincial poverty statistics.',
            indexTitle: '2000 Philippine provincial poverty statistics.',
          },
          {
            rowNumber: 1,
            resourceTitle: "Halsbury's laws of England.",
            indexTitle: "Halsbury's laws of England.",
          },
          {
            rowNumber: 2,
            resourceTitle:
              'The war of the rebellion [electronic resource]: a compilation of the official records of the Union and Confederate armies. Pub. under the direction of the secretary of war ...',
            indexTitle:
              'War of the rebellion a compilation of the official records of the Union and Confederate armies.',
          },
        ]).each((instanceData) => {
          FileDetails.openInstanceInInventory('Created', instanceData.rowNumber);
          InstanceRecordView.verifyInstancePaneExists();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrids.push(initialInstanceHrId);
          });

          InstanceRecordView.verifyResourceTitle(instanceData.resourceTitle);
          InstanceRecordView.verifyIndexTitle(instanceData.indexTitle);
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(fileName);
        });
      },
    );
  });
});
