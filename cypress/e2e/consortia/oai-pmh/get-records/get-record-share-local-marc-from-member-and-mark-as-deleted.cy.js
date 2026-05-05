import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  consortiaId: null,
  localMarcInstance: {
    title: `AT_C422190_LocalMarcInstance_${getRandomPostfix()}`,
    uuid: null,
    hrid: null,
  },
  member1: {
    locationId: null,
    locationName: null,
    holdingsId: null,
  },
  member2: {
    locationId: null,
    holdingsId: null,
  },
};

const userPermissions = [
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
  Permissions.consortiaInventoryShareLocalInstance.gui,
];

describe('OAI-PMH', () => {
  describe('GetRecord', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        cy.getAdminToken();

        // Get consortia ID
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });

        // Configure OAI-PMH behavior for College tenant (Member-1)
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.member1.locationId = locations[0].id;
          testData.member1.locationName = locations[0].name;
        });

        // Configure OAI-PMH behavior for University tenant (Member-2)
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.member2.locationId = locations[0].id;
        });

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );

        // Create local MARC instance in College tenant (Member-1)
        cy.setTenant(Affiliations.College);
        cy.createSimpleMarcBibViaAPI(testData.localMarcInstance.title).then((instanceId) => {
          testData.localMarcInstance.uuid = instanceId;

          // Share local instance from Member-1 via API
          InventoryInstance.shareInstanceViaApi(
            testData.localMarcInstance.uuid,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );

          // Get instance data after sharing to capture updated HRID
          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.localMarcInstance.hrid = instanceData.hrid;

            // Create Holdings in Member-1 (College)
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.localMarcInstance.uuid,
                permanentLocationId: testData.member1.locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                testData.member1.holdingsId = holding.id;
              });
            });

            // Create Holdings in Member-2 (University)
            cy.setTenant(Affiliations.University);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.localMarcInstance.uuid,
                permanentLocationId: testData.member2.locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                testData.member2.holdingsId = holding.id;
              });
            });
          });
        });

        // Create user with permissions
        cy.resetTenant();
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });
          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: testData.user.userId,
            permissions: userPermissions,
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings and instance from College tenant (Member-1)
        cy.setTenant(Affiliations.College);
        if (testData.member1.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.member1.holdingsId);
        }
        if (testData.localMarcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.localMarcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete holdings from University tenant (Member-2)
        cy.setTenant(Affiliations.University);
        if (testData.member2.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.member2.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Reset Central tenant OAI-PMH settings
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422190 Consortia | SRS+Inventory | GetRecord | ListRecords | Make local MARC Shared from Member and mark as Deleted (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422190', 'nonParallel'] },
        () => {
          // Step 1: Search for shared-from-member MARC Instance with holdings in member-1
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.localMarcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.localMarcInstance.title);

          // Step 2-3: Edit MARC record and mark as deleted (LDR 05 → "d")
          InstanceRecordView.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.selectFieldsDropdownOption(
            'LDR',
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.D,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsSetForDeletion();

          // Step 4: GetRecord marc21 from member-1 tenant - verify deleted status
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.getRecordRequest(
            testData.localMarcInstance.uuid,
            Affiliations.College,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.localMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 5: GetRecord marc21_withholdings from member-1 - verify deleted status
          OaiPmhEdge.getRecordRequest(
            testData.localMarcInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.localMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 6: ListRecords marc21_withholdings from member-1 - verify deleted status
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.localMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 7: ListRecords marc21 from member-1 - verify deleted status
          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.localMarcInstance.uuid,
                true,
                true,
                Affiliations.College,
              );
            },
          );

          // Step 8: ListRecords marc21 from central tenant - verify deleted status
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.localMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 9: ListRecords marc21_withholdings from central - verify deleted status
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.localMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });
        },
      );
    });
  });
});
