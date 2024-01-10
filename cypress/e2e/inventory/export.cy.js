import { Checkbox } from '../../../interactors';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let userId;
const instanceTitle = `Inventory export test ${Number(new Date())}`;
let locationName;
let locationId;

describe('ui-inventory: exports', () => {
  before('navigates to Inventory', () => {
    let source;

    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
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
          locationId = Cypress.env('locations')[0].id;
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle,
              languages: ['eng'],
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              },
            ],
            items: [
              [
                {
                  barcode: `testItem_${getRandomPostfix()}`,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
              ],
            ],
          });
        });
    });
  });

  beforeEach('navigate to inventory', () => {
    cy.visit(TopMenu.inventoryPath);
  });

  after('delete test data', () => {
    cy.getAdminToken();
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `(keyword all "${instanceTitle}") sortby title`,
    }).then((instance) => {
      cy.deleteItemViaApi(instance.items[0].id);
      cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
      InventoryInstance.deleteInstanceViaApi(instance.id);
    });
    Users.deleteViaApi(userId);
    FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*', 'SearchInstanceUUIDs*');
  });

  it(
    'C9284 Export small number of Instance UUIDs (30 or fewer) (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
      InventorySearchAndFilter.saveUUIDs();

      cy.intercept('/search/instances/ids**').as('getIds');
      cy.wait('@getIds', getLongDelay()).then((req) => {
        const expectedUUIDs = InventorySearchAndFilter.getUUIDsFromRequest(req);

        FileManager.verifyFile(
          InventoryActions.verifySaveUUIDsFileName,
          'SearchInstanceUUIDs*',
          InventoryActions.verifySavedUUIDs,
          [expectedUUIDs],
        );
      });
    },
  );

  it('C9287 Export CQL query (firebird)', { tags: ['smoke', 'firebird'] }, () => {
    InventorySearchAndFilter.byLanguage();
    InventorySearchAndFilter.searchByParameter(
      'Keyword (title, contributor, identifier, HRID, UUID)',
      instanceTitle,
    );
    InventorySearchAndFilter.byEffectiveLocation(locationName);
    InventorySearchAndFilter.saveCQLQuery();

    FileManager.verifyFile(
      InventoryActions.verifySaveCQLQueryFileName,
      'SearchInstanceCQLQuery*',
      InventoryActions.verifySaveCQLQuery,
      [locationId, instanceTitle, 'eng'],
    );
  });

  it(
    'C196757 Export selected records (MARC) (firebird)',
    { tags: ['smoke', 'firebird', 'broken'] },
    () => {
      InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
      cy.do(InventorySearchAndFilter.getSearchResult().find(Checkbox()).click());
      InventorySearchAndFilter.exportInstanceAsMarc();

      cy.intercept('/data-export/quick-export').as('getIds');
      cy.wait('@getIds', getLongDelay()).then((req) => {
        const expectedIDs = req.request.body.uuids;

        FileManager.verifyFile(
          InventoryActions.verifyInstancesMARCFileName,
          'QuickInstanceExport*',
          InventoryActions.verifyInstancesMARC,
          [expectedIDs],
        );
      });

      cy.visit(TopMenu.dataExportPath);
      DataExportResults.verifyQuickExportResult();
    },
  );
});
