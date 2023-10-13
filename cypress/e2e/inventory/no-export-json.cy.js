import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../support/fragments/users/users';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('ui-inventory: query search', () => {
  before('create inventory instance', () => {
    cy.createTempUser([permissions.uiInventoryViewCreateEditInstances.gui]).then(
      (userProperties) => {
        user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      },
    );
  });

  after('Delete all data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375963 Verify "Export instances (JSON)" option is hidden in "Actions" menu of "Inventory" pane (firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      InventorySearchAndFilter.verifyNoExportJsonOption();
      InventorySearchAndFilter.searchByParameter('Title (all)', item.instanceName);
      InventorySearchAndFilter.verifyNoExportJsonOption();
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventorySearchAndFilter.verifyNoExportJsonOption();
      InventorySearchAndFilter.resetAll();
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.searchByParameter(
        'Keyword (title, contributor, identifier, HRID, UUID)',
        item.instanceName,
      );
      InventorySearchAndFilter.verifyNoExportJsonOption();
      InventorySearchAndFilter.resetAll();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.verifyNoExportJsonOption();
    },
  );
});
