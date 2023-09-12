import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';

const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
describe('ui-inventory: actions', () => {
  before('login and create test data', () => {
    cy.loginAsAdmin();
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
  });

  beforeEach('navigates to inventory', () => {
    cy.visit(TopMenu.inventoryPath);
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  });

  it(
    'C196752 verifies action menu options before any search is conducted (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
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
    'C196753 Verify Action menu options - search results pane populated (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
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
