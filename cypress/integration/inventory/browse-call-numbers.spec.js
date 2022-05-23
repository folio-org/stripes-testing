import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import testTeams from '../../support/dictionary/testTeams';

describe('ui-inventory: browse call numbers', () => {
  beforeEach('navigate to inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C347902 Verify "Browse call numbers" option on the Instances tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseCallNumbers();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.showsOnlyEffectiveLocation();
  });

  it('C347903 Verify "Browse call numbers" option on Holdings tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.switchToHoldings();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.browseCallNumberIsAbsent();
  });

  // TODO: Think about creating new user with minimal permissions
  it('C347923 Verify "Browse call numbers" option on Item tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.switchToItem();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.browseCallNumberIsAbsent();
  });

  it('C350377 Verify the "Browse subjects" search option on the Instances tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseSubjects();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.filtersIsAbsent();
    InventorySearch.browseSubjectsSearch();
    cy.reload();
    InventorySearch.verifyCallNumberBrowsePane();
    InventorySearch.filtersIsAbsent();
  });

  it('C350378 Verify the "Browse subjects" search option on the Holdings tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.switchToHoldings();
    InventorySearch.browseSubjectIsAbsent();
  });

  it('C350379 Verify the "Browse subjects" search option on the Item tab', { tags: [TestTypes.smoke, testTeams.firebird] }, () => {
    InventorySearch.instanceTabIsDefault();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.switchToItem();
    InventorySearch.browseSubjectIsAbsent();
  });
});
