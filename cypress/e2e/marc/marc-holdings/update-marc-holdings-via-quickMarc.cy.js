import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import { RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let user;
    let instanceHrid;
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileName = `C417047 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      cy.getAdminToken().then(() => {
        DataImport.uploadFileViaApi(filePathForUpload, fileName);
        Logs.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
        InventoryInstance.createHoldingsRecord();
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        Users.deleteViaApi(user.userId);
      });
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
