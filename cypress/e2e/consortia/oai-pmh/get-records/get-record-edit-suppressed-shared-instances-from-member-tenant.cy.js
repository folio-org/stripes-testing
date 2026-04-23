import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C422178_SharedMarcInstance_${getRandomPostfix()}`,
  },
  folioInstance: {
    title: `AT_C422178_SharedFolioInstance_${getRandomPostfix()}`,
  },
  electronicAccess: {
    uri: 'http://test856.com',
    linkText: 'Test 856 Link',
    materialsSpecified: 'Test Materials',
    publicNote: 'Test Public Note',
  },
  college: {
    locationId: null,
    sourceId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
  },
  university: {
    locationId: null,
    sourceId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
  },
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
  Permissions.uiInventoryViewCreateEditInstances.gui,
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

        // Configure OAI-PMH behavior for College tenant: Transfer suppressed with flag
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

        // Configure OAI-PMH behavior for University tenant: Skip suppressed records
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
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            testData.marcInstance.uuid = instanceId;

            // Suppress MARC instance from discovery
            cy.getInstanceById(instanceId).then((instanceData) => {
              cy.updateInstance({
                ...instanceData,
                discoverySuppress: true,
              });
            });

            // Create holdings for MARC instance in College tenant
            cy.setTenant(Affiliations.College);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: testData.college.locationId,
              sourceId: testData.college.sourceId,
            }).then((holdingsData) => {
              testData.college.marcHoldingsId = holdingsData.id;
            });

            // Create holdings for MARC instance in University tenant
            cy.setTenant(Affiliations.University);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: testData.university.locationId,
              sourceId: testData.university.sourceId,
            }).then((holdingsData) => {
              testData.university.marcHoldingsId = holdingsData.id;
            });
          },
        );

        cy.resetTenant();

        // Create shared FOLIO instance in Central tenant
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.folioInstance.title,
              discoverySuppress: true,
            },
          }).then((createdInstanceData) => {
            testData.folioInstance.uuid = createdInstanceData.instanceId;

            // Create holdings for FOLIO instance in College tenant
            cy.setTenant(Affiliations.College);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.uuid,
              permanentLocationId: testData.college.locationId,
              sourceId: testData.college.sourceId,
            }).then((holdingsData) => {
              testData.college.folioHoldingsId = holdingsData.id;
            });

            // Create holdings for FOLIO instance in University tenant
            cy.setTenant(Affiliations.University);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.uuid,
              permanentLocationId: testData.university.locationId,
              sourceId: testData.university.sourceId,
            }).then((holdingsData) => {
              testData.university.folioHoldingsId = holdingsData.id;
            });
          });
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
        if (testData.college.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.marcHoldingsId);
        }
        if (testData.college.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete University holdings
        cy.setTenant(Affiliations.University);
        if (testData.university.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.marcHoldingsId);
        }
        if (testData.university.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete instances from Central
        cy.resetTenant();
        if (testData.marcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        if (testData.folioInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422178 Consortia | SRS+Inventory | GetRecord | Suppressed with flag | Skip suppressed: Edit shared MARC and shared FOLIO Instances (with associated Holdings in Member tenant) from Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422178', 'nonParallel'] },
        () => {
          // Step 1-3: Edit shared MARC instance from College tenant - Add 856 field
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
          InstanceRecordView.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.addRow(4);
          QuickMarcEditor.fillInFieldValues(
            5,
            '856',
            `$u ${testData.electronicAccess.uri} $y ${testData.electronicAccess.linkText} $3 ${testData.electronicAccess.materialsSpecified} $z ${testData.electronicAccess.publicNote}`,
            '4',
            '0',
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          // Step 4-6: Switch to University and edit shared FOLIO instance - Add electronic access
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InventoryNewInstance.addElectronicAccess({
            relationshipName: 'Resource',
            uri: testData.electronicAccess.uri,
            linkText: testData.electronicAccess.linkText,
            materialsSpecified: testData.electronicAccess.materialsSpecified,
            urlPublicNote: testData.electronicAccess.publicNote,
          });
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.waitLoading();

          // Step 7-9: Verify MARC instance in College tenant (t=1)
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
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
              '856',
              { ind1: '4', ind2: '0' },
              {
                t: '1',
                u: testData.electronicAccess.uri,
                y: testData.electronicAccess.linkText,
                3: testData.electronicAccess.materialsSpecified,
                z: testData.electronicAccess.publicNote,
              },
            );
          });

          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
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
              '856',
              { ind1: '4', ind2: '0' },
              {
                t: '1',
                u: testData.electronicAccess.uri,
                y: testData.electronicAccess.linkText,
                3: testData.electronicAccess.materialsSpecified,
                z: testData.electronicAccess.publicNote,
              },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
              rights: 'discovery suppressed',
              identifier: testData.electronicAccess.uri,
            });
          });

          // Step 10-12: Verify MARC instance in University tenant (idDoesNotExist)
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.University,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.University,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.University,
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          // Step 13-15: Verify FOLIO instance in College tenant (t=1)
          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.College,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '856',
              { ind1: '4', ind2: '0' },
              {
                t: '1',
                u: testData.electronicAccess.uri,
                y: testData.electronicAccess.linkText,
                3: testData.electronicAccess.materialsSpecified,
                z: testData.electronicAccess.publicNote,
              },
            );
          });

          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '856',
              { ind1: '4', ind2: '0' },
              {
                t: '1',
                u: testData.electronicAccess.uri,
                y: testData.electronicAccess.linkText,
                3: testData.electronicAccess.materialsSpecified,
                z: testData.electronicAccess.publicNote,
              },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.College,
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.folioInstance.uuid, {
              rights: 'discovery suppressed',
              identifier: testData.electronicAccess.uri,
            });
          });

          // Step 16-18: Verify FOLIO instance in University tenant (idDoesNotExist)
          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.University,
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.University,
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          OaiPmhEdge.getRecordRequest(
            testData.folioInstance.uuid,
            Affiliations.University,
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });
        },
      );
    });
  });
});
