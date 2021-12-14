import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/InventoryActions';
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

    // Need time for download file TODO: think about how it can be fixed
    cy.wait(Cypress.env('downloadTimeout'));

    FileManager.findDownloadedFilesByMask('SearchInstanceCQLQuery*')
      .then((downloadedFilenames) => {
        const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];
        InventoryActions.verifySaveSQLQueryFileName(lastDownloadedFilename);

        FileManager.readFile(lastDownloadedFilename)
          .then((actualCQLQuery) => {
            InventoryActions.verifySaveSQLQuery(actualCQLQuery, '*', 'eng');
          });
      });
  });
});
