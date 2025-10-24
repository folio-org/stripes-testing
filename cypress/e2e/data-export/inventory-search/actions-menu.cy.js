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
      'C773248 verifies action menu options before any search is conducted (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C773248'] },
      () => {
        InventoryActions.open();

        cy.expect(InventorySearchAndFilter.getAllSearchResults().absent());
        InventoryActions.optionsIsDisabled([
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);
      },
    );

    it(
      'C773249 Verify Action menu options - search results pane populated (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C773249'] },
      () => {
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventoryActions.open();

        InventoryActions.optionsIsEnabled([
          InventoryActions.options.saveUUIDs,
          InventoryActions.options.saveCQLQuery,
          InventoryActions.options.exportMARC,
          InventoryActions.options.showSelectedRecords,
        ]);
      },
    );
  });
});
