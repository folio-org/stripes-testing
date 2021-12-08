import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import Checkbox from '../../../interactors/checkbox';


describe('inventory: exports', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C9284 verifies export UUIDs instances', () => {
    cy.do([
      InventorySearch.searchByEffectiveLocation(),
      InventoryActions.open(),
      InventoryActions.options.saveUUIDs.click()
    ]);

    // TODO: think about move it to separate func
    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds').then((obj) => {
      const expectedUUIDs = InventorySearch.getUUIDsFromRequest(obj);

      // Need time for download file TODO: think about how it can be fixed
      cy.wait(Cypress.env('downloadTimeout'));

      FileManager.findDownloadedFilesByMask('SearchInstanceUUIDs*')
        .then((downloadedFilenames) => {
          const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];
          InventoryActions.verifySaveUUIDsFileName(lastDownloadedFilename);

          FileManager.readFile(lastDownloadedFilename)
            .then((actualUUIDs) => {
              InventoryActions.verifySavedUUIDs(actualUUIDs, expectedUUIDs);
            });
        });
    });
  });

  it('C196755 verifies search result counts and selected counts', () => {
    cy.do([
      InventorySearch.searchByEffectiveLocation(),
      InventorySearch.getSearchResult(0).find(Checkbox()).click(),
      InventorySearch.getSearchResult(2).find(Checkbox()).click(),
    ]);

    InventorySearch.verifySelectedRecords(2);
  });
});
