import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let instanceHrid;
    const testData = {
      rowIndex: 9,
      tag866: '866',
      newTagValue: '86',
      errorMessage: 'Record cannot be saved. A MARC tag must contain three characters.',
      filePath: 'oneMarcBib.mrc',
      fileNameForCreateInstance: `C345393 autotestFile${getRandomPostfix()}.mrc`,
      jobProfileForCreateInstance: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      editedFile: `C345393 editedAutotestFileName${getRandomPostfix()}.mrc`,
      fileNameForCreateHoldings: `C345393 autotestFileName${getRandomPostfix()}.mrc`,
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
            'marcHoldingsFileForC345393.mrc',
            testData.editedFile,
            ['in00000000023'],
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
      'C345393 Cannot save existing MARC holdings with not valid length of MARC tag (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345393'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingTagValue(testData.rowIndex, testData.newTagValue);

        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkErrorMessage(testData.rowIndex, testData.errorMessage);
        QuickMarcEditor.closeAllCallouts();
        QuickMarcEditor.closeWithoutSavingAfterChange();
        HoldingsRecordView.viewSource();
        InventoryViewSource.verifyExistanceOfValueInRow(testData.tag866, testData.rowIndex);
      },
    );
  });
});
