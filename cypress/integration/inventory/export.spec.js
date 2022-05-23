import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import testTypes from '../../support/dictionary/testTypes';
import { Checkbox } from '../../../interactors';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';

let userId = '';
const instanceTitle = `Inventory export test ${Number(new Date())}`;
let locationName = '';

describe('ui-inventory: exports', () => {
  before('navigates to Inventory', () => {
    let source;

    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            source = InventoryHoldings.getHoldingSources({ limit: 1 });
          })
          .then(() => {
            locationName = Cypress.env('locations')[0].name;
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
                languages: ['eng']
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                [{
                  barcode: `testItem_${getRandomPostfix()}`,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          });
      });
  });

  beforeEach('navigate to inventory', () => {
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `(keyword all "${instanceTitle}") sortby title`
    })
      .then(instance => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteUser(userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it('C9284 verifies export UUIDs instances', { tags: [testTypes.smoke] }, () => {
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventorySearch.saveUUIDs();

    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds', getLongDelay())
      .then((req) => {
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
    InventorySearch.searchByParameter('Keyword (title, contributor, identifier)', instanceTitle);
    InventorySearch.byEffectiveLocation(locationName);
    InventorySearch.saveCQLQuery();

    FileManager.verifyFile(
      InventoryActions.verifySaveCQLQueryFileName,
      'SearchInstanceCQLQuery*',
      InventoryActions.verifySaveCQLQuery,
      [instanceTitle]
    );
  });

  it('C196757 verifies export instances (MARC)', { tags: [testTypes.smoke] }, () => {
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    cy.do(InventorySearch.getSearchResult().find(Checkbox()).click());
    InventorySearch.exportInstanceAsMarc();

    cy.intercept('/data-export/quick-export').as('getIds');
    cy.wait('@getIds', getLongDelay())
      .then((req) => {
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
