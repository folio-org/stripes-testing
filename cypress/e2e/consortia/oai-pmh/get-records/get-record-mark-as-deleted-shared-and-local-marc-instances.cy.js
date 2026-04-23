import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
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
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

const testData = {
  user: {},
  sharedMarcInstance: {
    title: `AT_C422182_SharedMarcInstance_${getRandomPostfix()}`,
  },
  localMarcInstance: {
    title: `AT_C422182_LocalMarcInstance_${getRandomPostfix()}`,
  },
  college: {
    locationId: null,
    sourceId: null,
    sharedHoldingsId: null,
  },
  university: {
    locationId: null,
    sourceId: null,
    sharedHoldingsId: null,
  },
};
const sharedMarcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${testData.sharedMarcInstance.title}`,
    indicators: ['\\', '\\'],
  },
];
const localMarcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${testData.localMarcInstance.title}`,
    indicators: ['\\', '\\'],
  },
];
const userPermissions = [
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];

describe('OAI-PMH', () => {
  describe('Consortia', () => {
    describe('GetRecord', () => {
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
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.college.locationId = locations[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.college.sourceId = folioSource.id;
        });

        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.university.locationId = locations[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.university.sourceId = folioSource.id;
        });

        cy.resetTenant();

        // Create shared MARC instance in Central tenant
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          sharedMarcInstanceFields,
        ).then((instanceId) => {
          testData.sharedMarcInstance.uuid = instanceId;

          // Create holdings for shared MARC instance in College tenant
          cy.setTenant(Affiliations.College);
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.sharedMarcInstance.uuid,
            permanentLocationId: testData.college.locationId,
            sourceId: testData.college.sourceId,
          }).then((holdingsData) => {
            testData.college.sharedHoldingsId = holdingsData.id;
          });

          // Create holdings for shared MARC instance in University tenant
          cy.setTenant(Affiliations.University);
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.sharedMarcInstance.uuid,
            permanentLocationId: testData.university.locationId,
            sourceId: testData.university.sourceId,
          }).then((holdingsData) => {
            testData.university.sharedHoldingsId = holdingsData.id;
          });
        });

        // Create local MARC instance in College tenant via API
        cy.setTenant(Affiliations.College);
        cy.createMarcBibliographicViaAPI(
          QuickMarcEditor.defaultValidLdr,
          localMarcInstanceFields,
        ).then((instanceId) => {
          testData.localMarcInstance.uuid = instanceId;
        });

        cy.resetTenant();

        // Create user and login to College tenant
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

        // Delete College holdings
        cy.setTenant(Affiliations.College);
        if (testData.college.sharedHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.sharedHoldingsId);
        }
        if (testData.localMarcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.localMarcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete University holdings
        cy.setTenant(Affiliations.University);
        if (testData.university.sharedHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.sharedHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete shared MARC instance from Central
        cy.resetTenant();
        if (testData.sharedMarcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.sharedMarcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422182 Consortia | SRS+Inventory | GetRecord | Marked as Deleted shared MARC and local MARC Instances from Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422182', 'nonParallel'] },
        () => {
          // Step 1-3: Mark shared MARC instance as deleted
          InventoryInstances.searchByTitle(testData.sharedMarcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.sharedMarcInstance.title);
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
          InventoryInstances.resetAllFilters();

          // Step 4-7: Mark local MARC instance as deleted
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.localMarcInstance.title);
          InventoryInstance.waitInstanceRecordViewOpened(testData.localMarcInstance.title);
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

          // Step 8: Verify shared MARC instance with marc21 format - deleted status
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.getRecordRequest(
            testData.sharedMarcInstance.uuid,
            Affiliations.College,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.sharedMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 9: Verify shared MARC instance with marc21_withholdings format - deleted status
          OaiPmhEdge.getRecordRequest(
            testData.sharedMarcInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.sharedMarcInstance.uuid,
              true,
              true,
              Affiliations.College,
            );
          });

          // Step 10: Verify local MARC instance with marc21_withholdings format - deleted status
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

          // Step 11: Verify local MARC instance with marc21 format - deleted status
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
        },
      );
    });
  });
});
