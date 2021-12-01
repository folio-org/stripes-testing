import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';


describe('inventory / actions: export UUIDs', () => {
  beforeEach('navigates to Inventory and delete downloads folder', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C9284 verifies export UUIDs instances', () => {
    cy.do([
      InventorySearch.searchByEffectiveLocation(),
      InventoryActions.open(),
      InventoryActions.options.saveUUIDs.click()
    ]);

    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds').then((obj) => {
      const expectedUUIDs = [];
      obj.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });

      // Need time for download file TODO: think about how it can be fixed
      cy.wait(3000);

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
});
