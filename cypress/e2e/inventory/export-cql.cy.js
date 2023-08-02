import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

let userId;
let location;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('ui-inventory: exports', () => {
  before('navigates to Inventory', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
      permissions.dataExportEnableModule.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading
        });
        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${item.instanceId}"` })
          .then(instance => {
            cy.getLocations({ limit: 1, query: `id="${instance.items[0].effectiveLocationId}"` })
              .then(res => { location = res.name; });
          });
        cy.getInstanceById(item.instanceId).then(body => {
          body.languages = ['eng']
          cy.updateInstance(body);
        })
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(userId);
    FileManager.deleteFileFromDownloadsByMask('SearchInstanceCQLQuery*');
  });

  it('C9287 Export CQL query (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.byLanguage();
    InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', item.instanceName);
    InventorySearchAndFilter.byEffectiveLocation(location);
    InventorySearchAndFilter.saveCQLQuery();

    FileManager.verifyFile(
      InventoryActions.verifySaveCQLQueryFileName,
      'SearchInstanceCQLQuery*',
      InventoryActions.verifySaveCQLQuery,
      [item.instanceName]
    );
  });
});
