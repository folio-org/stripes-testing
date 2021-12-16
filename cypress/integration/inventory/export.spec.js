import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';


describe('inventory: exports', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C9284 verifies export UUIDs instances', () => {
    InventorySearch.byEffectiveLocation();
    InventorySearch.saveUUIDs();

    // TODO: think about move it to separate func
    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds').then((req) => {
      const expectedUUIDs = InventorySearch.getUUIDsFromRequest(req);

      FileManager.verifyFile(
        InventoryActions.verifySaveUUIDsFileName,
        'SearchInstanceUUIDs*',
        InventoryActions.verifySavedUUIDs,
        [expectedUUIDs]
      );
    });
  });

  it('C196755 verifies search result counts and selected counts', () => {
    const checkedResult = 2;

    InventorySearch.byEffectiveLocation();
    InventorySearch.selectResultCheckboxes(checkedResult);
    InventorySearch.verifySelectedRecords(checkedResult);
  });

  it('C9287 verifies export CQL instances', () => {
    InventorySearch.byLanguage();
    InventorySearch.byKeywords();
    InventorySearch.byEffectiveLocation();
    InventorySearch.saveCQLQuery();

    FileManager.verifyFile(
      InventoryActions.verifySaveCQLQueryFileName,
      'SearchInstanceCQLQuery*',
      InventoryActions.verifySaveCQLQuery
    );
  });
});
