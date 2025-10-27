import { Checkbox } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import inventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_NAMES, LOCATION_IDS, APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Data Export', () => {
  describe('Search in Inventory', () => {
    before('navigates to Inventory', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;
        item.instanceId = inventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
          (holdings) => {
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
            });
          },
        );
        cy.getInstanceById(item.instanceId).then((body) => {
          body.languages = ['rus'];
          cy.updateInstance(body);
        });
        cy.login(user.username, user.password);
      });
    });

    beforeEach('navigate to inventory', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
    });

    after('delete test data', () => {
      cy.getAdminToken();
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `(keyword all "${item.instanceName}") sortby title`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(
        'QuickInstanceExport*',
        'SearchInstanceUUIDs*',
        'SearchInstanceCQLQuery*',
      );
    });

    it(
      'C9284 Export small number of Instance UUIDs (30 or fewer) (firebird)',
      { tags: ['smoke', 'firebird', 'C9284'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', item.instanceName);
        InventorySearchAndFilter.saveUUIDs();

        cy.intercept('/search/instances/ids**').as('getIds');
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedUUIDs = InventorySearchAndFilter.getUUIDsFromRequest(req);

          FileManager.verifyFile(
            InventoryActions.verifySaveUUIDsFileName,
            'SearchInstanceUUIDs*',
            InventoryActions.verifySavedUUIDs,
            [expectedUUIDs],
          );
        });
      },
    );

    it(
      'C9287 Export CQL query (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C9287'] },
      () => {
        InventorySearchAndFilter.byLanguage('Russian');
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          item.instanceName,
        );
        InventorySearchAndFilter.byEffectiveLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
        cy.wait(3000);
        InventorySearchAndFilter.saveCQLQuery();
        FileManager.verifyFile(
          InventoryActions.verifySaveCQLQueryFileName,
          'SearchInstanceCQLQuery*',
          InventoryActions.verifySaveCQLQuery,
          [LOCATION_IDS.MAIN_LIBRARY, item.instanceName, 'rus'],
        );
      },
    );

    it(
      'C196757 Export selected records (MARC) (firebird)',
      { tags: ['smoke', 'firebird', 'broken', 'C196757'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', item.instanceName);
        cy.do(InventorySearchAndFilter.getSearchResult().find(Checkbox()).click());
        InventorySearchAndFilter.exportInstanceAsMarc();

        cy.intercept('/data-export/quick-export').as('getIds');
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedIDs = req.request.body.uuids;

          FileManager.verifyFile(
            InventoryActions.verifyInstancesMARCFileName,
            'QuickInstanceExport*',
            InventoryActions.verifyInstancesMARC,
            [expectedIDs],
          );
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportResults.verifyQuickExportResult();
      },
    );
  });
});
