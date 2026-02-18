import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let instanceHrid;
    const testData = {
      rowIndex: 4,
      acqEndDateBox: 'records[4].content.AcqEndDate',
      invalidAcqEndDate: '///',
      errorMessage: 'Record not saved. Please check the character length of the fixed fields.',
      tag008: '008',
      filePath: 'oneMarcBib.mrc',
      fileNameForCreateInstance: `C503024 autotestFile${getRandomPostfix()}.mrc`,
      jobProfileForCreateInstance: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      editedFile: `C503024 editedAutotestFileName${getRandomPostfix()}.mrc`,
      fileNameForCreateHoldings: `C503024 autotestFileName${getRandomPostfix()}.mrc`,
      jobProfileForCreateHoldings: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        DataImport.uploadFileViaApi(
          testData.filePath,
          testData.fileNameForCreateInstance,
          testData.jobProfileForCreateInstance,
        ).then((response) => {
          instanceHrid = response[0].instance.hrid;
          testData.instanceId = response[0].instance.id;

          DataImport.editMarcFile(
            'marcHoldingsFileForC503024.mrc',
            testData.editedFile,
            ['in11887186'],
            [instanceHrid],
          );
        });
        DataImport.uploadFileViaApi(
          testData.editedFile,
          testData.fileNameForCreateHoldings,
          testData.jobProfileForCreateHoldings,
        ).then((response) => {
          testData.holdingsId = response[0].holding.id;
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(() => {
        cy.deleteHoldingRecordViaApi(testData.holdingsId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${testData.editedFile}`);
    });

    it(
      'C503024 Cannot save existing MARC holdings record with not valid value in "008" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C503024'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.fillEmptyTextFieldOfField(
          testData.rowIndex,
          testData.acqEndDateBox,
          testData.invalidAcqEndDate,
        );

        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
      },
    );
  });
});
