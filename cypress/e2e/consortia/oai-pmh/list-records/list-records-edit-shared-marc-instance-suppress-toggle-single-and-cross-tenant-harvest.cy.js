import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C402364_SharedMarcInstance_${getRandomPostfix()}`,
    updatedTitle: '',
    uuid: null,
    hrid: null,
  },
  holdingsId: null,
  locationName: null,
  locationId: null,
};

const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.valid008ValuesInstance,
  },
  {
    tag: '245',
    content: `$a ${testData.marcInstance.title}`,
    indicators: ['\\', '\\'],
  },
];

const userPermissions = [
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }
        cy.getAdminToken();

        // Configure OAI-PMH behavior for College tenant with "Transfer suppressed records"
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
          testData.locationId = locations[0].id;
        });

        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Create shared MARC instance in Central tenant (suppressed from discovery)
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            testData.marcInstance.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              testData.marcInstance.hrid = instanceData.hrid;

              // Suppress instance from discovery
              cy.updateInstance({
                ...instanceData,
                discoverySuppress: true,
              });
            });

            // Switch to College tenant to add Holdings to the shared instance
            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.marcInstance.uuid,
                permanentLocationId: testData.locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                testData.holdingsId = holding.id;
              });
            });
          },
        );

        // Create user with permissions in Central and College tenants
        cy.resetTenant();
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

          cy.wait(120_000); // Wait for 2 minutes to ensure the instance is created "in the past"
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // Delete holdings from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Delete shared instance from Central tenant
        cy.resetTenant();
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402364 Consortia | SRS | ListRecords | Suppressed with flag | Skip suppressed | Edit shared MARC instance (with associated Holdings) from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402364', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Step 1-2: Search for shared MARC Instance with Holdings
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

          // Step 3-4: Verify instance NOT in current date OAI-PMH response before editing
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 5-6: Edit MARC bibliographic record from College tenant
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('245', `$a ${testData.marcInstance.title} Updated`);

          testData.marcInstance.updatedTitle = `${testData.marcInstance.title} Updated`;

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          // Step 7: Single-tenant ListRecords marc21 (WITH suppressed - flag transfer)
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
          });

          // Step 8: Single-tenant ListRecords marc21_withholdings (WITH suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
          });

          // Step 9: Single-tenant ListRecords oai_dc (WITH suppressed)
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 10: Cross-tenant ListRecords marc21 (WITH suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
          });

          // Step 11: Cross-tenant ListRecords marc21_withholdings (WITH suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
          });

          // Step 12: Cross-tenant ListRecords oai_dc (WITH suppressed)
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 13: Change OAI-PMH settings to "Skip suppressed from discovery records"
          cy.resetTenant();
          cy.getAdminToken();

          // Update College tenant settings
          cy.setTenant(Affiliations.College);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Update University tenant settings
          cy.setTenant(Affiliations.University);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Update Central tenant settings
          cy.resetTenant();
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Step 14: Single-tenant ListRecords marc21 (WITHOUT suppressed - skip)
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 15: Single-tenant ListRecords marc21_withholdings (WITHOUT suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 16: Single-tenant ListRecords oai_dc (WITHOUT suppressed)
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 17: Cross-tenant ListRecords marc21 (WITHOUT suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 18: Cross-tenant ListRecords marc21_withholdings (WITHOUT suppressed)
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 19: Cross-tenant ListRecords oai_dc (WITHOUT suppressed)
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });
        },
      );
    });
  });
});
