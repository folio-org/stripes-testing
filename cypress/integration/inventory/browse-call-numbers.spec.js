import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';

describe('Browse call number feature', () => {
  beforeEach('navigate to inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C347902 Verify "Browse call numbers" option on the Instances tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseCallNumbers();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.showsOnlyEffectiveLocation();
  });

  it('C347903 Verify "Browse call numbers" option on Holdings tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.switchToHoldings();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.browseCallNumberIsAbsent();
  });

  // TODO: Think about creating new user with minimal permissions
  it('C347923 Verify "Browse call numbers" option on Item tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.switchToItem();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.browseCallNumberIsAbsent();
  });

  it('C350377 Verify the "Browse subjects" search option on the Instances tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseSubjects();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.filtersIsAbsent();
    InventorySearch.browseSubjectsSearch();
    cy.reload();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventorySearch.filtersIsAbsent();
  });
});
