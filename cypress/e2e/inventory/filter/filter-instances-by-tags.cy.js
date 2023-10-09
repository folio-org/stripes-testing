import uuid from 'uuid';
import TestTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';

describe('inventory', () => {
  describe('Tags', () => {
    let userId;
    let instanceRecord = null;
    const testTag = `test_tag_${uuid()}`;
    const tagsCount = '1';

    beforeEach(() => {
      cy.createTempUser([permissions.inventoryAll.gui, permissions.uiTagsPermissionAll.gui])
        .then(({ username, password, userId: id }) => {
          userId = id;
          cy.login(username, password);
        })
        .then(() => {
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            instanceRecord = instanceData;
          });
        });
    });

    afterEach(() => {
      InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
      Users.deleteViaApi(userId);
    });

    it(
      'C343215 Filter instances by tags (volaris)',
      { tags: [TestTypes.smoke, DevTeams.volaris] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.searchInstanceByTitle(instanceRecord.instanceTitle);
        InventorySearchAndFilter.verifySearchResult(instanceRecord.instanceTitle);
        InventorySearchAndFilter.selectFoundInstance(instanceRecord.instanceTitle);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(testTag);
        cy.reload();
        InventorySearchAndFilter.verifyTagCount(tagsCount);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.filterByTag(testTag);
        InventorySearchAndFilter.verifyIsFilteredByTag(instanceRecord.instanceTitle);
      },
    );
  });
});
