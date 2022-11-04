import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import FilterInstancesByTags from '../../support/fragments/inventory/filterInstancesByTags';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Filter instances by tags', () => {
  let userId;
  let instanceRecord = null;
  const testTag = `test_tag_${uuid()}`;
  const tagsCount = '1';

  beforeEach(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiTagsPermissionAll.gui,
    ]).then(({ username, password, userId: id }) => {
      userId = id;
      cy.login(username, password);
    }).then(() => {
      FilterInstancesByTags.createInstanceViaApi().then(({ instanceData }) => {
        instanceRecord = instanceData;
      });
    });
  });

  afterEach(() => {
    InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
    Users.deleteViaApi(userId);
  });

  it('C343215 Filter instances by tags (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.inventoryPath);
    FilterInstancesByTags.verifyPanesExist();
    InventorySearch.searchInstanceByTitle(instanceRecord.instanceTitle);
    FilterInstancesByTags.verifySearchResult(instanceRecord.instanceTitle);
    FilterInstancesByTags.selectFoundInstance(instanceRecord.instanceTitle);
    FilterInstancesByTags.verifyInstanceDetailsView();
    FilterInstancesByTags.openTagsField();
    FilterInstancesByTags.verifyTagsView();
    FilterInstancesByTags.addTag(testTag);
    FilterInstancesByTags.verifyTagCount(tagsCount);
    FilterInstancesByTags.closeTagsAndInstanceDetailPane();
    FilterInstancesByTags.resetAllAndVerifyNoResultsAppear();
    FilterInstancesByTags.filterByTag(testTag);
    FilterInstancesByTags.verifyIsFilteredByTag(instanceRecord.instanceTitle);
  });
});
