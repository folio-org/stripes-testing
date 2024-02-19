import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let instanceHrid;
    const testData = {
      filePath: 'oneMarcBib.mrc',
      fileNameForCreateInstance: `C417047 autotestFile${getRandomPostfix()}.mrc`,
      jobProfileForCreateInstance: 'Default - Create instance and SRS MARC Bib',
      editedFile: `C417047 editedAutotestFileName${getRandomPostfix()}`,
      fileNameForCreateHoldings: `C417047 autotestFileName${getRandomPostfix()}`,
      jobProfileForCreateHoldings: 'Default - Create Holdings and SRS MARC Holdings',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.filePath,
        testData.fileNameForCreateInstance,
        testData.jobProfileForCreateInstance,
      ).then((response) => {
        instanceHrid = response.entries[0].relatedInstanceInfo.hridList[0];
        testData.instanceId = response.entries[0].relatedInstanceInfo.idList[0];

        DataImport.editMarcFile(
          'marcBibFileForC359241.mrc',
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
        testData.holdingsId = response.entries[0].relatedHoldingsInfo[0].id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

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
      'C417047 Update MARC Holdings via quickMARC; check for updated 005 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.close();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField('852', '$b  E');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndCloseAndReturnHoldingsDetailsPage();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains('$b E');
      },
    );
  });
});
