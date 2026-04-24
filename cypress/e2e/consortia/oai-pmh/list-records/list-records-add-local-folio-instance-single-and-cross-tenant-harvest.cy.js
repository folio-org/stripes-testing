import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C407762_LocalFolioInstance_${getRandomPostfix()}`,
    id: null,
  },
};

const userPermissions = [Permissions.inventoryAll.gui];

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        // Skip test if Edge configuration is not available
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        cy.getAdminToken();

        // Configure OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete instance from College tenant (local instance)
        cy.setTenant(Affiliations.College);
        if (testData.folioInstance.id) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.id);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();

        // Reset OAI-PMH settings for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407762 Consortia | Inventory | ListRecords |ListIdentifiers: Add local FOLIO instance to Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C407762', 'nonParallel'] },
        () => {
          // Step 1: Select Actions => New local record
          InventoryInstances.addNewInventory();

          // Step 2: Fill in Resource title
          InventoryNewInstance.fillResourceTitle(testData.folioInstance.title);

          // Step 3: Select Resource type => Save & close button becomes active
          InventoryNewInstance.fillResourceType();

          // Step 4: Click Save and close
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          // Get instance UUID
          InventoryInstance.getId().then((instanceId) => {
            testData.folioInstance.id = instanceId;

            // Step 5: ListRecords marc21 for College tenant (single-tenant harvest)
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            OaiPmhEdge.listRecordsRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 6: ListIdentifiers marc21 for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 7: ListRecords marc21_withholdings for College tenant
            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 8: ListIdentifiers marc21_withholdings for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 9: ListRecords oai_dc for College tenant
            OaiPmhEdge.listRecordsRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 10: ListIdentifiers oai_dc for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 11: ListRecords marc21 for Central tenant (cross-tenant harvest)
            OaiPmhEdge.listRecordsRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 12: ListIdentifiers marc21 for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 13: ListRecords marc21_withholdings for Central tenant
            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 14: ListIdentifiers marc21_withholdings for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 15: ListRecords oai_dc for Central tenant
            OaiPmhEdge.listRecordsRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 16: ListIdentifiers oai_dc for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });
          });
        },
      );
    });
  });
});
