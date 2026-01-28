import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import getRandomPostfix from '../../../support/utils/stringTools';

let folioInstanceId;
const folioInstance = {
  title: `AT_C375190_FolioInstance_${getRandomPostfix()}`,
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

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;

          cy.getLocations({ limit: 1 }).then((locations) => {
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: folioInstanceId,
                permanentLocationId: locations.id,
                sourceId: folioSource.id,
                discoverySuppress: true,
              });
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375190 GetRecord: Verify FOLIO holdings suppressed from discovery in case Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375190', 'nonParallel'] },
      () => {
        OaiPmh.getRecordRequest(folioInstanceId, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstanceId },
          );
          OaiPmh.verifyMarcFieldAbsent(response, folioInstanceId, ['856', '952']);
        });
      },
    );
  });
});
