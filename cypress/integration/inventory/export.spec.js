import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import testTypes from '../../support/dictionary/testTypes';
import { Checkbox } from '../../../interactors';
import { getLongDelay } from '../../support/utils/cypressTools';


// TODO: think about another way about retry
describe('ui-inventory: exports', { retries: 1 }, () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C9284 verifies export UUIDs instances', { tags: [testTypes.smoke] }, () => {
    InventorySearch.byEffectiveLocation();
    InventorySearch.saveUUIDs();

    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds', getLongDelay()).then((req) => {
      const expectedUUIDs = InventorySearch.getUUIDsFromRequest(req);

      FileManager.verifyFile(
        InventoryActions.verifySaveUUIDsFileName,
        'SearchInstanceUUIDs*',
        InventoryActions.verifySavedUUIDs,
        [expectedUUIDs]
      );
    });
  });

  it('C9287 verifies export CQL query', { tags: [testTypes.smoke] }, () => {
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

  it('C196757 verifies export instances (MARC)', { tags: [testTypes.smoke] }, () => {
    InventorySearch.byEffectiveLocation();
    cy.do(InventorySearch.getSearchResult().find(Checkbox()).click());
    InventorySearch.exportInstanceAsMarc();

    cy.intercept('/data-export/quick-export').as('getIds');
    cy.wait('@getIds', getLongDelay()).then((req) => {
      const expectedIDs = req.request.body.uuids;

      FileManager.verifyFile(
        InventoryActions.verifyInstancesMARCFileName,
        'QuickInstanceExport*',
        InventoryActions.verifyInstancesMARC,
        [expectedIDs]
      );
    });

    cy.visit(TopMenu.dataExportPath);
    DataExportResults.verifyQuickExportResult();
  });
});
