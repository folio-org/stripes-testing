import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
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
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';

let user;
const marcInstance = {
  title: `AT_C386509_MarcInstance_${getRandomPostfix()}`,
};
const marcHoldingsFile = {
  marc: 'marcBibHoldingForC386509.mrc',
  fileNameImported: `testMarcHoldingsFileC386509.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC386509${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};
const itemBarcode = getRandomPostfix();
const callNumberData = {
  holdings: {
    callNumber: 'Holdings call number',
    prefix: 'Holdings call number prefix',
    suffix: 'Holdings call number suffix',
    copyNumber: 'Holdings copy number',
  },
  item: {
    callNumber: 'Item call number',
    prefix: 'Item call number prefix',
    suffix: 'Item call number suffix',
    copyNumber: 'Item copy number',
    type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
  },
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
      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceResponse) => {
        marcInstance.id = instanceResponse;

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
            });
          });
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C386509 GetRecord: SRS - Verify that Holdings and Item "Call number" fields are properly included in "952" field of response (subfields "e", "f", "g", "h", "n") (firebird)',
      { tags: ['extendedPath', 'firebird', 'C386509'] },
      () => {
        // Step 1-3: Send OAI-PMH GetRecord request and verify 952 field with Holdings call number
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              e: callNumberData.holdings.callNumber,
              f: callNumberData.holdings.prefix,
              g: callNumberData.holdings.suffix,
              n: callNumberData.holdings.copyNumber,
            },
          );
        });

        // Step 4: Add Item to the Instance by clicking "Add item" button
        cy.getUserToken(user.username, user.password);
        InventoryInstance.addItem();

        // Step 5-6: Fill in item record fields
        ItemRecordNew.fillItemRecordFields({
          barcode: itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 7: Save & close item
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 8-9: Send OAI-PMH GetRecord request and verify 952 field (Holdings call number still effective)
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Verify 952 field still shows Holdings call number (Item has no call number yet)
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              e: callNumberData.holdings.callNumber,
              f: callNumberData.holdings.prefix,
              g: callNumberData.holdings.suffix,
            },
            ['n'],
          );
        });

        // Step 10: Navigate to item and edit
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);
        ItemRecordView.openItemEditForm(marcInstance.title);

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
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Verify 952 field now shows Item call number (Item call number takes precedence)
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
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
