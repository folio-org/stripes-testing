import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterItemCreatedTimestamp;
const marcInstance = {
  title: `AT_C385648_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (location) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  marcInstance.id,
                  marcInstance.hrid,
                  location.code,
                ).then((holdingsId) => {
                  marcInstance.holdingsId = holdingsId;

                  cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.SELECTED}"` }).then(
                    (loanType) => {
                      const loanTypeId = loanType[0].id;

                      cy.getDefaultMaterialType().then((materialType) => {
                        const materialTypeId = materialType.id;

                        InventoryItems.createItemViaApi({
                          barcode: marcInstance.itemBarcode,
                          holdingsRecordId: holdingsId,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: 'Available' },
                        }).then((itemId) => {
                          marcInstance.itemId = itemId;
                        });
                      });
                    },
                  );
                });
              },
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        // For clear test results, it is necessary to wait to ensure that
        // deleting item is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C385648 verb=ListIdentifiers: Verify that Instance MARC is retrieved when both Item and Holdings are deleted (marc21) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C385648'] },
      () => {
        afterItemCreatedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and find created MARC bib
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 4-5: Verify that response doesn't initially include Instance MARC record
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
          },
        );

        // Step 6-7: Navigate to item and delete it
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openItemByBarcode(marcInstance.itemBarcode);
        ItemRecordView.waitLoading();

        // Step 8: Delete the item
        ItemRecordView.clickDeleteButton();
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();

        // Step 9: Verify item deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(marcInstance.title);

        // Step 10: Send request and verify that response contains the MARC Instance with associated Holdings and recently deleted Item
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );

        // For clear test results, it is necessary to wait to ensure that
        // deleting holding is treated as an update to the Instance record
        cy.wait(60_000);

        const afterItemDeletedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 11: Delete the holdings record
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.delete();

        // Step 12: Verify holdings deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(marcInstance.title);

        // Step 13-14: Send ListIdentifiers request and verify Instance MARC is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemDeletedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );
      },
    );
  });
});
