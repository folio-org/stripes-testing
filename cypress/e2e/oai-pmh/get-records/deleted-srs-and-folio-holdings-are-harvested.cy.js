import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const marcInstance = {
  title: `AT_C375979_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C375979_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create MARC instance with MARC holdings
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

        // Create FOLIO instance with FOLIO holdings
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.id = createdInstanceData.instanceId;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (location) => {
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: folioInstance.id,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
                    discoverySuppress: false,
                  }).then((holding) => {
                    folioInstance.holdingsId = holding.id;
                  });
                });
              },
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375979 GetRecords: SRS & Inventory - Verify that deleted SRS and FOLIO Holdings are harvested (marc21_withholdings) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375979', 'nonParallel'] },
      () => {
        // Steps 1-4: Delete SRS Holdings
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyHoldingsAbsent(LOCATION_NAMES.MAIN_LIBRARY_UI);

        // Steps 5-9: Delete FOLIO Holdings
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyHoldingsAbsent(LOCATION_NAMES.MAIN_LIBRARY_UI);

        // Step 10: Verify SRS Instance with deleted Holdings is still harvestable
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '245',
            { ind1: ' ', ind2: ' ' },
            { a: marcInstance.title },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
        });

        // Step 11: Verify FOLIO Instance with deleted Holdings is still harvestable
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '245',
            { ind1: '0', ind2: '0' },
            { a: folioInstance.title },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstance.id, false, true);
        });
      },
    );
  });
});
