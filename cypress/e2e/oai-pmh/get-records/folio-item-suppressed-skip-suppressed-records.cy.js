import { LOAN_TYPE_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C375196_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
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

            cy.getLocations({ limit: 1 }).then((res) => {
              const locationId = res.id;

              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                const sourceId = folioSource.id;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: folioInstance.id,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  folioInstance.holdingId = holding.id;

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventorySearchAndFilter.waitLoading,
                  });
                });
              });
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375196 GetRecord: Verify Item FOLIO suppressed from discovery in case -- Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375196', 'nonParallel'] },
      () => {
        // Step 1: Click on the "Add item" button in the "Holdings" accordion
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.addItem();

        // Step 2: Mark as active the "Suppress from discovery" checkbox on the "Administrative data" accordion
        ItemRecordNew.markAsSuppressedFromDiscovery();

        // Step 3: Select Material type, Permanent loan type, and save
        ItemRecordNew.fillItemRecordFields({
          barcode: folioInstance.itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 4: Send OAI-PMH GetRecord request and verify response
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          // Verify FOLIO record is retrieved and 999 field contains "t" subfield set to "0"
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstance.id },
          );
          OaiPmh.verifySubfieldWithValueAbsent(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              p: LOAN_TYPE_NAMES.CAN_CIRCULATE,
              i: MATERIAL_TYPE_NAMES.BOOK,
              m: folioInstance.itemBarcode,
            },
          );
        });
      },
    );
  });
});
