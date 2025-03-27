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
      filePath: 'oneMarcBib.mrc',
      fileNameForCreateInstance: `C417047 autotestFile${getRandomPostfix()}.mrc`,
      jobProfileForCreateInstance: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      editedFile: `C417047 editedAutotestFileName${getRandomPostfix()}.mrc`,
      fileNameForCreateHoldings: `C417047 autotestFileName${getRandomPostfix()}.mrc`,
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

    // skipped due to https://folio-org.atlassian.net/browse/EUREKA-618
    it.skip(
      'C417047 Update MARC Holdings via quickMARC; check for updated 005 (folijet) (TaaS)',
      { tags: [] },
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
