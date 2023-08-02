import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import testTypes from '../../support/dictionary/testTypes';
import { Checkbox } from '../../../interactors';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES } from '../../support/constants';

let userId;
const instanceTitle = `Inventory export test ${Number(new Date())}`;

describe('ui-inventory: exports', () => {
  before('navigates to Inventory', () => {
    let source;

    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
      permissions.dataExportEnableModule.gui,
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
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
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

  after('delete test data', () => {
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `(keyword all "${instanceTitle}") sortby title`
    })
      .then(instance => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(userId);
    FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*', 'SearchInstanceUUIDs*');
  });

  it('C9284 Export small number of Instance UUIDs (30 or fewer) (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventorySearchAndFilter.saveUUIDs();

    cy.intercept('/search/instances/ids**').as('getIds');
    cy.wait('@getIds', getLongDelay())
      .then((req) => {
        const expectedUUIDs = InventorySearchAndFilter.getUUIDsFromRequest(req);

        FileManager.verifyFile(
          InventoryActions.verifySaveUUIDsFileName,
          'SearchInstanceUUIDs*',
          InventoryActions.verifySavedUUIDs,
          [expectedUUIDs]
        );
      });
  });

  it('C196757 Export selected records (MARC) (firebird)', { tags: [testTypes.smoke, devTeams.firebird, testTypes.broken] }, () => {
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    cy.do(InventorySearchAndFilter.getSearchResult().find(Checkbox()).click());
    InventorySearchAndFilter.exportInstanceAsMarc();

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
