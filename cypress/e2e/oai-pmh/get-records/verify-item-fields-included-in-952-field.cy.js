import {
  ITEM_STATUS_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const marcInstance = {
  title: `AT_C385659_MarcInstance_${getRandomPostfix()}`,
};
const marcHoldingsFile = {
  marc: 'marcBibHoldingForC385659.mrc',
  fileNameImported: `testMarcHoldingsFileC385659.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC385659${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};
const itemData = {
  barcode: `barcode_${getRandomPostfix()}`,
  materialType: 'book',
  copyNumber: `Item copy number ${getRandomPostfix()}`,
  enumeration: `Enumeration ${getRandomPostfix()}`,
  chronology: `Chronology ${getRandomPostfix()}`,
  volume: `Volume ${getRandomPostfix()}`,
  permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
  temporaryLoanType: 'Reading room',
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;

        cy.getInstanceById(marcInstance.id)
          .then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            DataImport.editMarcFile(
              marcHoldingsFile.marc,
              marcHoldingsFile.editedFileName,
              ['in00000000001'],
              [marcInstance.hrid],
            );
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              marcHoldingsFile.editedFileName,
              marcHoldingsFile.fileNameImported,
              marcHoldingsFile.jobProfileToRun,
            ).then((response) => {
              marcInstance.holdingsId = response[0].holding.id;
              cy.getDefaultMaterialType().then((res) => {
                const materialTypeId = res.id;
                cy.getLoanTypes({ query: `name=="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                  (loanTypes) => {
                    const loanTypeId = loanTypes[0].id;

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: marcInstance.holdingsId,
                      barcode: itemData.barcode,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      copyNumber: itemData.copyNumber,
                      enumeration: itemData.enumeration,
                      chronology: itemData.chronology,
                      volume: itemData.volume,
                    }).then((item) => {
                      marcInstance.itemId = item.id;
                    });
                  },
                );
              });
            });
          });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C385659 GetRecord: SRS - Verify that Item fields are properly included in "952" field of response (subfields "i", "j", "k", "l", "m", "n", "p") (firebird)',
      { tags: ['extendedPath', 'firebird', 'C385659'] },
      () => {
        // Step 1: Get Instance UUID from the address bar
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldings(['']);

        // Step 2: Send OAI-PMH GetRecord request with marc21_withholdings
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Step 3: Verify 952 field subfields with permanent loan type
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
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
            },
          );
        });

        // Step 4: Navigate to Item edit mode
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.waitLoading();

        // Step 5: Add Temporary loan type
        ItemRecordView.openItemEditForm(marcInstance.title);
        ItemRecordEdit.addTemporaryLoanType(itemData.temporaryLoanType);

        // Step 6: Save the item
        ItemRecordEdit.saveAndClose();
        ItemRecordView.verifyCalloutMessage();
        ItemRecordView.waitLoading();

        // Step 7: Send the same OAI-PMH GetRecord request again
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Step 8: Verify 952 field subfields with temporary loan type
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
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
            },
          );
        });
      },
    );
  });
});
