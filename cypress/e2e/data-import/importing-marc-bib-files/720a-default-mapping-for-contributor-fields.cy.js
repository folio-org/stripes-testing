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
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      createdRecordIDs: [],
      filePathForUpload: 'marcFileNameForC366549.mrc',
      marcFileName: `C366549 autotestMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      tag720: '720',
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C366549 Verify 720$a default mapping for Contributor fields (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.filePathForUpload, testData.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFileName);
        Logs.checkJobStatus(testData.marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        [
          {
            fieldContent: [
              '$a Abdul Rahman, Alias $e editor $4 edt',
              '$a Boguslawski, Pawel $4 aut $4 edt',
              '$a Gold, Christopher $e editor $e author',
              '$a Said, Mohamad Nor $e deditor',
              '$a Said, Abdul $4 edi',
            ],
            rowNumber: 0,
          },
          {
            fieldContent: [
              '$a SAKAGUCHI, T. $4 mod $4 aut',
              '$a OZAWA, K. $4 mra',
              '$a HAMAGAKI, H. $4 mra $e editor',
              '$a ESUMI, S. $e metadata contact $4 mde',
              '$a KURIHARA, N. $e data contact $e creator',
              '$a CHUJO, T. $4 dlm $4 dln ',
            ],
            rowNumber: 1,
          },
          {
            fieldContent: [
              '$a John Alldis Choir. $4 prf $4 cnd',
              '$a Liverpool Philharmonic Choir. $e perf',
              '$a London Symphony Orchestra. $e oth $4 prf',
              '$a Royal Liverpool Philharmonic Orchestra. $e prf',
            ],
            rowNumber: 2,
          },
        ].forEach((content) => {
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, content.rowNumber);
          InstanceRecordView.waitLoading();
          InstanceRecordView.viewSource();
          content.fieldContent.forEach((field) => {
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag720, field);
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(testData.marcFileName);
        });
      },
    );
  });
});
