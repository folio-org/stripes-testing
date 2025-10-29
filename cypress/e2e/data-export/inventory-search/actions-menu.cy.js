import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
let user;

describe('Data Export', () => {
  describe('Inventory Search', () => {
    before('login and create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        permissions.uiInventorySingleRecordImport.gui,
        permissions.inventoryCreateAndDownloadInTransitItemsReport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        cy.login(user.username, user.password);
      });
    });

    beforeEach('navigates to inventory', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C196752 Verify "Actions" menu options in three segments when no search results are returned (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C196752'] },
      () => {
        InventoryActions.open();

        cy.expect(InventorySearchAndFilter.getAllSearchResults().absent());
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.switchToHoldings();
        InventoryActions.open();
        cy.expect(InventorySearchAndFilter.getAllSearchResults().absent());
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveHoldingsUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.switchToItem();
        InventoryActions.open();
        cy.expect(InventorySearchAndFilter.getAllSearchResults().absent());
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);
      },
    );

    it(
      'C196753 Verify Action menu options - search results pane populated (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C196753'] },
      () => {
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventoryActions.open();
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.import,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventoryActions.open();
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveHoldingsUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveHoldingsUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.import,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventoryActions.open();
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.import,
        ]);
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);

        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventoryActions.optionsIsEnabled([
          InventoryActions.options.new,
          InventoryActions.options.newFastAddRecord,
          InventoryActions.options.newMarcBibRecord,
          InventoryActions.options.InTransitItemsReport,
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.import,
          InventoryActions.options.showSelectedRecords,
        ]);
      },
    );
  });
});
