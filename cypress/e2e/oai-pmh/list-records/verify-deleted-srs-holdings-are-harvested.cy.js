import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
const marcInstance = { title: `AT_C375952_MarcInstance_${getRandomPostfix()}` };

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
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

        // For clear test results, it is necessary to wait to ensure that
        // deleting the Holdings record is treated as an update to the Instance record
        cy.wait(60_000);

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375952 ListRecords: Verify that deleted SRS HOLDINGS are harvested (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375952'] },
      () => {
        // Step 1: Go to Inventory app, select Holdings tab, search for SRS instance with MARC Holdings
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Click on Holdings row and click "View holdings" button
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 3: Click Actions button and select Delete element
        const dateAndTimeOfDeletion = DateTools.getCurrentDateForOaiPmh();
        HoldingsRecordView.delete();

        // Step 4: Click Delete button in confirmation modal
        InventoryInstance.waitLoading();
        InventoryInstance.verifyHoldingsAbsent(LOCATION_NAMES.MAIN_LIBRARY_UI);

        // Step 5: Send ListRecords request to verify deleted holdings are harvested
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('marc21_withholdings', dateAndTimeOfDeletion).then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
        });
      },
    );
  });
});
