import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import FileManager from '../../support/utils/fileManager';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import { ITEM_STATUS_NAMES } from '../../support/constants';

let userId;
const instanceTitle = `Inventory export test ${Number(new Date())}`;
const itemBarcode = `testItem_${getRandomPostfix()}`;
let locationName = '';

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
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading
        });
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
                  barcode: itemBarcode,
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

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    Users.deleteViaApi(userId);
    FileManager.deleteFileFromDownloadsByMask('SearchInstanceCQLQuery*');
  });

  it('C9287 Export CQL query (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.byLanguage();
    InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', instanceTitle);
    InventorySearchAndFilter.byEffectiveLocation(locationName);
    InventorySearchAndFilter.saveCQLQuery();

    FileManager.verifyFile(
      InventoryActions.verifySaveCQLQueryFileName,
      'SearchInstanceCQLQuery*',
      InventoryActions.verifySaveCQLQuery,
      [instanceTitle]
    );
  });
});
