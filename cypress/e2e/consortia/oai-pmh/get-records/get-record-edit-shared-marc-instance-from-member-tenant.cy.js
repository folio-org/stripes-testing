import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C402373_SharedMarcInstance_${getRandomPostfix()}`,
    updatedTitle: '',
  },
  locationName: '',
  locationId: null,
  sourceId: null,
  holdingsId: null,
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
const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');
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
        // Configure OAI-PMH behavior for College tenant with SRS source
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
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });

        cy.resetTenant();
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            testData.marcInstance.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              testData.marcInstance.hrid = instanceData.hrid;
            });

            cy.setTenant(Affiliations.College);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: testData.locationId,
              sourceId: testData.sourceId,
            }).then((holdingsData) => {
              testData.holdingsId = holdingsData.id;
            });
          },
        );

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
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();
        cy.resetTenant();
        if (testData.marcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402373 Consortia | SRS | GetRecord: Edit shared MARC instance (with associated Holdings) from Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402373', 'nonParallel'] },
        () => {
          // Step 1: Search for shared MARC instance in College tenant
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);

          // Step 2-4: Edit MARC bibliographic record from College tenant
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('245', `$a ${testData.marcInstance.title} Updated`);

          testData.marcInstance.updatedTitle = `${testData.marcInstance.title} Updated`;

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          // Step 5: Verify GetRecord response with marc21 metadata format
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21',
            collegeApiKey,
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
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
            OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, ['952']);
          });

          // Step 6: Verify GetRecord response with marc21_withholdings metadata format
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            collegeApiKey,
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
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.updatedTitle },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 7: Verify GetRecord response with oai_dc metadata format
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'oai_dc',
            collegeApiKey,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
              title: testData.marcInstance.updatedTitle,
            });
          });
        },
      );
    });
  });
});
