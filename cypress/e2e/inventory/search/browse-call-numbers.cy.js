import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-inventory: browse call numbers', () => {
  beforeEach('navigate to inventory', () => {
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  it('C347902 Verify "Browse call numbers" option on the Instances tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.showsOnlyEffectiveLocation();
  });

  it('C347903 Verify "Browse call numbers" option on Holdings tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.switchToHoldings();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.browseCallNumberIsAbsent();
  });

  // TODO: Think about creating new user with minimal permissions
  it('C347923 Verify "Browse call numbers" option on Item tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.browseCallNumberIsAbsent();
  });

  it('C350377 Verify the "Browse subjects" search option on the Instances tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseSubjects();
    InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.filtersIsAbsent();
    InventorySearchAndFilter.browseSubjectsSearch();
    cy.reload();
    InventorySearchAndFilter.verifyCallNumberBrowsePane();
    InventorySearchAndFilter.filtersIsAbsent();
  });

  it('C350378 Verify the "Browse subjects" search option on the Holdings tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.switchToHoldings();
    InventorySearchAndFilter.browseSubjectIsAbsent();
  });

  it('C350379 Verify the "Browse subjects" search option on the Item tab (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.browseSubjectIsAbsent();
  });
});
