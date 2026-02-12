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
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C385658_FolioInstance_${getRandomPostfix()}`,
};
const itemData = {
  barcode: `barcode_${getRandomPostfix()}`,
  materialType: MATERIAL_TYPE_NAMES.BOOK,
  copyNumber: `Item copy number ${getRandomPostfix()}`,
  enumeration: `Enumeration ${getRandomPostfix()}`,
  chronology: `Chronology ${getRandomPostfix()}`,
  volume: `Volume ${getRandomPostfix()}`,
  permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
  temporaryLoanType: LOAN_TYPE_NAMES.SELECTED,
  callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
};
const holdingsCopyNumber = `Holdings copy number ${getRandomPostfix()}`;

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
          cy.getLoanTypes({ query: `name=="${itemData.permanentLoanType}"` }).then((loanTypes) => {
            cy.getMaterialTypes({ query: `name=="${itemData.materialType}"` }).then(
              (materialTypes) => {
                InventoryInstances.getCallNumberTypes({
                  query: `name=="${itemData.callNumberType}"`,
                }).then((callNumberTypes) => {
                  const permanentLoanTypeId = loanTypes[0].id;
                  const materialTypeId = materialTypes.id;
                  const callNumberTypeId = callNumberTypes[0].id;

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: folioInstance.title,
                    },
                    holdings: [
                      {
                        permanentLocationId: location.id,
                        copyNumber: holdingsCopyNumber,
                      },
                    ],
                    items: [
                      {
                        barcode: itemData.barcode,
                        status: { name: 'Available' },
                        permanentLoanType: { id: permanentLoanTypeId },
                        materialType: { id: materialTypeId },
                        itemLevelCallNumberTypeId: callNumberTypeId,
                        copyNumber: itemData.copyNumber,
                        enumeration: itemData.enumeration,
                        chronology: itemData.chronology,
                        volume: itemData.volume,
                      },
                    ],
                  }).then((instanceData) => {
                    folioInstance.id = instanceData.instanceId;
                    folioInstance.holdingsId = instanceData.holdingIds[0].id;
                    folioInstance.itemId = instanceData.holdingIds[0].itemIds[0];
                  });
                });
              },
            );
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
      'C385658 GetRecord: Inventory - Verify that Item fields are properly included in "952" field of response (subfields "i", "j", "k", "l", "m", "n", "p") (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C385658', 'nonParallel'] },
      () => {
        // Step 1: Instance UUID is already available in folioInstance.id
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Steps 2-3: Send OAI-PMH GetRecord request and verify 952 field with Item data
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              i: itemData.materialType,
              j: itemData.volume,
              k: itemData.enumeration,
              l: itemData.chronology,
              m: itemData.barcode,
              n: itemData.copyNumber,
              p: itemData.permanentLoanType,
              h: itemData.callNumberType,
            },
          );
        });

        // Step 4: Navigate to item and edit
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.openItemEditForm(folioInstance.title);

        // Step 5: Add Temporary loan type different from Permanent
        ItemRecordEdit.addTemporaryLoanType(itemData.temporaryLoanType);

        // Step 6: Save & close item
        ItemRecordEdit.saveAndClose();
        ItemRecordView.waitLoading();

        // Steps 7-8: Send OAI-PMH GetRecord request and verify 952 field with Temporary loan type
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              i: itemData.materialType,
              j: itemData.volume,
              k: itemData.enumeration,
              l: itemData.chronology,
              m: itemData.barcode,
              n: itemData.copyNumber,
              p: itemData.temporaryLoanType,
              h: itemData.callNumberType,
            },
          );
        });
      },
    );
  });
});
