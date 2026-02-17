import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { MATERIAL_TYPE_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterHoldingCreationTimestamp;
const folioInstance = {
  title: `AT_C380618_FolioInstance_${getRandomPostfix()}`,
  id: null,
  holdingsId: null,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.id = createdInstanceData.instanceId;

            cy.getLocations().then((location) => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: folioInstance.id,
                  permanentLocationId: location.id,
                  sourceId: folioSource.id,
                }).then((holdingsId) => {
                  folioInstance.holdingsId = holdingsId;
                });
              });
            });
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C380618 verb=ListIdentifiers: Verify that Instance FOLIO is retrieved in case added Item to it (marc21_withholdings) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C380618', 'nonParallel'] },
      () => {
        afterHoldingCreationTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and find created FOLIO instance
        InventoryInstances.searchByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 4-5: Verify that response doesn't initially include Instance FOLIO record
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreationTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, false);
          },
        );

        // Step 6: Click "Add item" button
        cy.getUserToken(user.username, user.password);
        InventoryInstance.addItem();

        // Step 7: Populate mandatory fields with available values
        ItemRecordNew.waitLoading(folioInstance.title);
        ItemRecordNew.fillItemRecordFields({
          barcode: folioInstance.itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 8: Click "Save & close" button
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 9: Send ListIdentifiers request and verify Instance FOLIO is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreationTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          },
        );
      },
    );
  });
});
