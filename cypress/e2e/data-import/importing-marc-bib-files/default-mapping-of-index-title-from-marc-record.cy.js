import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const instanceHrids = [];
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
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

    before('Create test data and login', () => {
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

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedFileForUpload}`);
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
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
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
