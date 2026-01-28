import { LOAN_TYPE_NAMES, LOCATION_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
const marcInstance = {
  title: `AT_C375194_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};
const electronicAccessData = {
  field: '856',
  indicator1: '4',
  indicator2: '0',
  subfields:
    '$a Holdings electronic access $u myurl.com $y text about electronic access $3 material type',
};
const electronicAccessDataItem = {
  relationshipType: 'Related resource',
  uri: 'http://test-item-url.com',
  linkText: 'Test Item',
  materialsSpecified: 'item materials specified',
  urlPublicNote: 'item url public note',
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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` }).then(
              (locations) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  marcInstance.id,
                  marcInstance.hrid,
                  locations.code,
                ).then((holdingsId) => {
                  marcInstance.holdingsId = holdingsId;

                  cy.loginAsAdmin({
                    path: TopMenu.inventoryPath,
                    waiter: InventorySearchAndFilter.waitLoading,
                  });
                  InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitLoading();
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.waitLoading();
                  QuickMarcEditor.updateLDR06And07Positions();
                  QuickMarcEditor.addEmptyFields(4);
                  QuickMarcEditor.addValuesToExistingField(
                    4,
                    electronicAccessData.field,
                    electronicAccessData.subfields,
                    electronicAccessData.indicator1,
                    electronicAccessData.indicator2,
                  );
                  QuickMarcEditor.saveAndCloseWithValidationWarnings();
                  QuickMarcEditor.checkAfterSaveAndClose();

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventorySearchAndFilter.waitLoading,
                  });
                });
              },
            );
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    });

    it(
      'C375194 GetRecord: Verify Item suppressed from discovery in case Transfer suppressed records with discovery flag value (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375194'] },
      () => {
        // Step 1: Click on the "Add item" button in the "Holdings" accordion
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.addItem();

        // Step 2: Mark as active the "Suppress from discovery" checkbox on the "Administrative data" accordion
        ItemRecordNew.markAsSuppressedFromDiscovery();

        // Step 3: Select Material type, Permanent loan type, add electronic access, and save
        ItemRecordNew.fillItemRecordFields({
          barcode: marcInstance.itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordNew.addElectronicAccessFields(electronicAccessDataItem);
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 4: Send OAI-PMH GetRecord request and verify suppressed item response
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { t: '0', i: marcInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            { t: '1' },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            { t: '0' },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            { t: '1' },
          );
        });
      },
    );
  });
});
