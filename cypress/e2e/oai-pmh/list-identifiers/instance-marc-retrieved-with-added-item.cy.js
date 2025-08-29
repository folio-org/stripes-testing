import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES, MATERIAL_TYPE_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterHoldingCreationTimestamp;
const marcInstance = {
  title: `AT_C380627_MarcInstance_${getRandomPostfix()}`,
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
        // adding item is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380627 verb=ListIdentifiers: Verify that Instance MARC is retrieved in case added Item to it (marc21_withholdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380627'] },
      () => {
        afterHoldingCreationTimestamp = DateTools.getCurrentDateForOaiPmh();
        // Step 1: Go to Inventory app and find created MARC bib
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 2-5: Verify that response doesn't initially include Instance MARC record
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreationTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
          },
        );

        // Step 6: Click "Add item" button
        cy.getUserToken(user.username, user.password);
        InventoryInstance.addItem();

        // Step 7: Populate mandatory fields with available values
        ItemRecordNew.waitLoading(marcInstance.title);
        ItemRecordNew.fillItemRecordFields({
          barcode: marcInstance.itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 8: Click "Save & close" button
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 9: Send ListIdentifiers request and verify Instance MARC is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreationTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );
      },
    );
  });
});
