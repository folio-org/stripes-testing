import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const instanceHrids = [];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC6690.mrc';
    const editedFileForUpload = `C6690 editedAutotestFile${getRandomPostfix()}.mrc`;
    const fileName = `C6690 autotestFile${getRandomPostfix()}.mrc`;
    const instances = [
      {
        title: '2000 Philippine provincial poverty statistics.',
        updatedTitle: `2000 Philippine provincial poverty statistics.${getRandomPostfix()}`,
      },
      {
        title: "Halsbury's laws of England.",
        updatedTitle: `Halsbury's laws of England.${getRandomPostfix()}`,
      },
      {
        title: 'The war of the rebellion',
        updatedTitle: `The war of the rebellion${getRandomPostfix()}`,
      },
    ];

    before('create test data', () => {
      // need to edit file for creating unique instance title
      DataImport.editMarcFile(
        filePathToUpload,
        editedFileForUpload,
        [instances[0].title, instances[1].title, instances[2].title],
        [instances[0].updatedTitle, instances[1].updatedTitle, instances[2].updatedTitle],
      );

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
      FileManager.deleteFile(`cypress/fixtures/${editedFileForUpload}`);
    });

    it(
      'C6690 Check the default mapping of the Index title from the MARC record to the Inventory Instance Index title field (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        cy.visit(TopMenu.inventoryPath);
        instances.forEach((instance) => {
          InventorySearchAndFilter.searchInstanceByTitle(instance.updatedTitle);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
            const instanceHrid = initialInstanceHrId;

            instanceHrids.push(instanceHrid);
          });

          InstanceRecordView.verifyResourceTitle(instance.updatedTitle);
        });
      },
    );
  });
});
