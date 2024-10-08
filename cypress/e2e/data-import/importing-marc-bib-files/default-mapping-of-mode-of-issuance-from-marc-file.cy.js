import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    const instanceHrids = [];
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'marcBibFileForC11121.mrc';
    const fileName = `C11121 autotestFile${getRandomPostfix()}.mrc`;

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        cy.wrap(instanceHrids).each((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C11121 Check the default mapping of Mode of issuance from the MARC record to the Inventory Instance record (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
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
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, instanceData.rowNumber);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrids.push(initialInstanceHrId);
          });
          InstanceRecordView.verifyModeOfIssuance(instanceData.modeOfIssuance);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(fileName);
        });
      },
    );
  });
});
