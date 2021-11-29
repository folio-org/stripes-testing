import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';


const downloadsFolder = Cypress.config('downloadsFolder');

describe('inventory / actions: export UUIDs', () => {
  beforeEach('navigates to Inventory and delete downloads folder', () => {
    cy.task('deleteFolder', downloadsFolder);
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C9284 verifies export UUIDs instances', () => {
    cy.do([
      InventorySearch.byEffectiveLocation(),
      InventoryActions.open(),
      InventoryActions.saveUUIDsOption().click()
    ]);

    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds').then((obj) => {
      const expectedUUIDs = [];
      obj.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });

      // This from official cypress examples https://github.com/cypress-io/cypress-example-recipes/tree/master/examples
      // Need time for download file
      cy.wait(3000);

      cy.task('findFiles', `${downloadsFolder}/*.csv`)
        .then((downloadedFilenames) => {
          const downloadedFilename = downloadedFilenames[0];
          InventoryActions.verifySaveUUIDsFileName(downloadedFilename);

          cy.readFile(downloadedFilename)
            .then((actualUUIDs) => {
              InventoryActions.verifySavedUUIDs(actualUUIDs, expectedUUIDs);
            });
        });
    });
  });
});
