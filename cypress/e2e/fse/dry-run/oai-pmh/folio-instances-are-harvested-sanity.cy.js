import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('OAI-PMH', () => {
  describe('Get records', () => {
    const { user, memberTenant } = parseSanityParameters();
    let folioInstanceId = null;
    let originalBehaviorConfig = null;
    const folioInstance = {
      title: `AT_C375972_FolioInstance_${getRandomPostfix()}`,
    };

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch user details
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          });
        })
        .then(() => {
          // Save original OAI-PMH behavior configuration
          cy.getConfigByName('OAIPMH', 'behavior').then((body) => {
            if (body.configs.length > 0) {
              originalBehaviorConfig = JSON.parse(body.configs[0].value);
              cy.log(`Original OAI-PMH config saved: ${JSON.stringify(originalBehaviorConfig)}`);
            } else {
              cy.log('No existing OAI-PMH behavior configuration found');
            }
          });
        })
        .then(() => {
          // Configure OAI-PMH behavior for test
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
            BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
            BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
          );
        })
        .then(() => {
          // Create test data
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: folioInstance.title,
              },
            }).then((createdInstanceData) => {
              folioInstanceId = createdInstanceData.instanceId;
            });
          });
        });
    });

    after('Cleanup', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      if (folioInstanceId) {
        InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      }
      // Restore original OAI-PMH behavior configuration
      if (originalBehaviorConfig) {
        cy.log(`Restoring OAI-PMH config: ${JSON.stringify(originalBehaviorConfig)}`);
        Behavior.updateBehaviorConfigViaApi(
          originalBehaviorConfig.suppressedRecordsProcessing,
          originalBehaviorConfig.recordsSource,
          originalBehaviorConfig.deletedRecordsSupport,
          originalBehaviorConfig.errorsProcessing,
        );
      }
    });

    it(
      'C375972 GetRecords: FOLIO instances are harvested (marc21) (firebird)',
      { tags: ['dryRun', 'firebird', 'C375972', 'nonParallel'] },
      () => {
        // Send OAI-PMH GetRecord request and verify response contains the FOLIO instance
        OaiPmh.getRecordRequest(folioInstanceId).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstanceId },
          );
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '245',
            { ind1: '0', ind2: '0' },
            { a: folioInstance.title },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstanceId, false, true);
        });
      },
    );
  });
});
