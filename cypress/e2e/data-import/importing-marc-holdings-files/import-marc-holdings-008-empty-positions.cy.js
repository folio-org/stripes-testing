import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C1332491_MarcBibInstance_${randomPostfix}`;
    const holdingsFileName = 'marcHoldingsFileForC1332491.mrc';
    const editedMarcFileName = `C1332491_MarcHoldingsFile_${randomPostfix}.mrc`;
    const tag866updatedContent = `AT_C1332491_866_${randomPostfix}`;
    const testData = {
      tag008: '008',
      tag866: '866',
      user: {},
    };
    const tag008BoxesValues = [
      { boxName: 'AcqStatus', expectedValue: '4' },
      { boxName: 'AcqMethod', expectedValue: 'u' },
      { boxName: 'AcqEndDate', expectedValue: '\\\\\\\\' },
      { boxName: 'Gen ret', expectedValue: '8' },
    ];
    let instanceHrid;

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        cy.createSimpleMarcBibViaAPI(instanceTitle).then((instanceId) => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            instanceHrid = instanceData.hrid;
          });
        });
      });
      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiInventory,
            CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorManage,
          ],
        );
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C1332491 Import MARC holdings record with empty positions 00-05 of 008 MARC field (promin)',
      { tags: ['extendedPath', 'promin', 'C1332491'] },
      () => {
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

        // Step 1: Replace HRID placeholder, upload and run with default MARC Holdings job profile
        DataImport.editMarcFile(
          holdingsFileName,
          editedMarcFileName,
          ['hridPlaceholder'],
          [instanceHrid],
        );
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 2: Open file details; verify Created in SRS MARC and Holdings columns
        Logs.openFileDetails(editedMarcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // Step 3: Click Created in Holdings column — Holdings detail view opens
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
        HoldingsRecordView.waitLoading();

        // Step 4: Actions > View source — verify 008 has blanks in positions 00-05
        HoldingsRecordView.viewSource();
        InventoryViewSource.waitHoldingLoading();
        InventoryViewSource.checkFieldContentMatch(testData.tag008, /^\s{6}4u\s+8\s+1\s+uu/);
        InventoryViewSource.close();

        // Step 5: Actions > Edit in quickMARC — verify 008 field values from the fixture
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        tag008BoxesValues.forEach((box) => {
          QuickMarcEditor.verifyTextBoxValueInField(
            testData.tag008,
            box.boxName,
            box.expectedValue,
          );
        });

        // Steps 6-7: Update 866 field and save; verify back on Holdings detail
        QuickMarcEditor.updateExistingField(testData.tag866, `$a ${tag866updatedContent}`);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        // Step 8: Actions > View source — verify 008 now has today's date in positions 00-05
        HoldingsRecordView.viewSource();
        InventoryViewSource.waitHoldingLoading();
        InventoryViewSource.checkFieldContentMatch(
          testData.tag008,
          new RegExp(`^${todayDateYYMMDD}4u\\s+8\\s+1\\s+uu`),
        );
        InventoryViewSource.close();

        // Step 9: Actions > Edit in quickMARC — verify 008 values are still correct
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        tag008BoxesValues.forEach((box) => {
          QuickMarcEditor.verifyTextBoxValueInField(
            testData.tag008,
            box.boxName,
            box.expectedValue,
          );
        });
      },
    );
  });
});
