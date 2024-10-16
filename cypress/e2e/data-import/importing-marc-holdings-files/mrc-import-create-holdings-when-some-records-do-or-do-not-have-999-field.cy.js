import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileName = `C359209 autotestFileName${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C359209 editedMarcFile${getRandomPostfix()}.mrc`;
    const errorMessage =
      '{"error":"A new MARC-Holding was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';
    const quantityOfItems = {
      created: '1',
      noAction: '3',
      error: '3',
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.settingsTenantViewLocation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(filePathForUpload, fileName, jobProfileToRun).then(
          (response) => {
            instanceHrid = response[0].instance.hrid;
          },
        );

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C359209 Checking the import to Create MARC Holdings records, when some incoming records do or do not have 999 ff fields (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        DataImport.editMarcFile(
          'marcFileForC359209.mrc',
          editedMarcFileName,
          ['test1', 'test2', 'test3', 'test4'],
          [instanceHrid, instanceHrid, instanceHrid, instanceHrid],
        );

        // upload a marc file for creating holdings
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
        );
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, 1);
        });
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
          2,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
          3,
        );
        // check created counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems.created);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems.created);
        // check No action counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems.noAction, 2);
        // check Error counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems.error, 3);
        FileDetails.openJsonScreen('Holdings');
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessage);
      },
    );
  });
});
