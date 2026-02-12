import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C386504_FolioInstance_${getRandomPostfix()}`,
};
const itemBarcode = getRandomPostfix();
const callNumberData = {
  holdings: {
    callNumber: 'Holdings call number',
    prefix: 'Holdings call number prefix',
    suffix: 'Holdings call number suffix',
    type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
    copyNumber: 'Holdings copy number',
  },
  item: {
    callNumber: 'Item call number',
    prefix: 'Item call number prefix',
    suffix: 'Item call number suffix',
    type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
    copyNumber: 'Item copy number',
  },
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((location) => {
          InventoryInstances.getCallNumberTypes().then((callNumberTypes) => {
            const holdingsCallNumberTypeId = callNumberTypes.find(
              (type) => type.name === callNumberData.holdings.type,
            ).id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: folioInstance.title,
              },
              holdings: [
                {
                  permanentLocationId: location.id,
                  callNumber: callNumberData.holdings.callNumber,
                  callNumberPrefix: callNumberData.holdings.prefix,
                  callNumberSuffix: callNumberData.holdings.suffix,
                  callNumberTypeId: holdingsCallNumberTypeId,
                  copyNumber: callNumberData.holdings.copyNumber,
                },
              ],
            }).then((instanceData) => {
              folioInstance.id = instanceData.instanceId;
              folioInstance.holdingsId = instanceData.holdingIds[0].id;
            });
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C386504 GetRecord: Inventory - Verify that Holdings and Item "Call number" fields are properly included in "952" field of response (subfields "e", "f", "g", "h", "n") (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C386504', 'nonParallel'] },
      () => {
        // Step 1: Instance UUID is already available in folioInstance.id
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Steps 2-3: Send OAI-PMH GetRecord request and verify 952 field with Holdings call number
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              e: callNumberData.holdings.callNumber,
              f: callNumberData.holdings.prefix,
              g: callNumberData.holdings.suffix,
              h: callNumberData.holdings.type,
              n: callNumberData.holdings.copyNumber,
            },
          );
        });

        // Step 4: Add Item to the Instance by clicking "Add item" button
        cy.getUserToken(user.username, user.password);
        InventoryInstance.clickAddItemByHoldingId({
          holdingId: folioInstance.holdingsId,
          instanceTitle: folioInstance.title,
        });

        // Step 5-6: Fill in item record fields
        ItemRecordNew.fillItemRecordFields({
          barcode: itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 7: Save & close item
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();

        // Step 8-9: Send OAI-PMH GetRecord request and verify 952 field (Holdings call number still effective, no subfield "n")
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          // Verify 952 field still shows Holdings call number (Item has no call number yet)
          // Subfield "n" should NOT be included when item has no copy number
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              e: callNumberData.holdings.callNumber,
              f: callNumberData.holdings.prefix,
              g: callNumberData.holdings.suffix,
              h: callNumberData.holdings.type,
            },
            ['n'],
          );
        });

        // Step 10: Navigate to item and edit
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InventoryInstance.openItemByBarcode(itemBarcode);
        ItemRecordView.openItemEditForm(folioInstance.title);

        // Step 11: Fill in Item call number fields
        ItemRecordNew.fillCallNumberValues({
          callNumber: callNumberData.item.callNumber,
          callNumberType: callNumberData.item.type,
          callNumberPrefix: callNumberData.item.prefix,
          callNumberSuffix: callNumberData.item.suffix,
          copyNumber: callNumberData.item.copyNumber,
        });

        // Step 12: Save & close item
        ItemRecordEdit.saveAndClose();
        ItemRecordView.waitLoading();

        // Step 13-14: Send OAI-PMH GetRecord request and verify 952 field with Item call number
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          // Verify 952 field now shows Item call number (Item call number takes precedence)
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              e: callNumberData.item.callNumber,
              f: callNumberData.item.prefix,
              g: callNumberData.item.suffix,
              h: callNumberData.item.type,
              n: callNumberData.item.copyNumber,
            },
          );
        });
      },
    );
  });
});
