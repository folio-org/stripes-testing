import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcFile: {
    marc: 'marcBibFileForC406998.mrc',
    fileName: `C406998_testMarcFile${getRandomPostfix()}.mrc`,
  },
  instanceTitle: 'AT_C406998_MarcInstance',
  marcInstance: {
    uuid: null,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  locationName: '',
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
};

const userPermissions = [
  Permissions.moduleDataImportEnabled.gui,
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];

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

        // Configure OAI-PMH behavior for College tenant with SRS+Inventory source
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );

        // Get location for holdings from College tenant
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
        });

        // Configure OAI-PMH behavior for University tenant with SRS+Inventory source
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );

        // Configure OAI-PMH behavior for Central tenant with SRS+Inventory source
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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

        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();

        // Delete instance from Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C406998 Consortia | SRS+Inventory | ListRecords | ListIdentifiers: Add shared MARC instance to Central tenant and enrich it with local FOLIO Holdings in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C406998', 'nonParallel'] },
        () => {
          // Step 1: Upload MARC file
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
          JobProfiles.waitFileIsUploaded();

          // Step 2: Select "Default - Create instance and SRS MARC Bib" job profile
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);

          // Step 3: Run job and verify completion
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.fileName);

          // Step 4: Verify import statuses
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.marcFile.fileName);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.instance,
          );

          // Step 5: Open instance in Inventory
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

          // Step 6-7: View MARC source and extract UUID from 999$i field
          InventoryInstance.viewSource();
          InventoryViewSource.extructDataFrom999Field().then((result) => {
            testData.marcInstance.uuid = result[0];
            InventoryViewSource.close();

            // Step 8: Switch to College tenant and search for the instance
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.marcInstance.uuid);
            InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

            // Step 9-10: Add local FOLIO holdings with call number, electronic access, and location
            InventoryInstance.pressAddHoldingsButton();
            InventoryNewHoldings.fillPermanentLocation(testData.locationName);
            InventoryNewHoldings.fillCallNumber(testData.holdingsData.callNumber);
            HoldingsRecordEdit.addElectronicAccessFields({
              relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
              uri: testData.electronicAccessData.uri,
              linkText: testData.electronicAccessData.linkText,
              materialsSpecified: testData.electronicAccessData.materialsSpecified,
              urlPublicNote: testData.electronicAccessData.publicNote,
            });
            HoldingsRecordEdit.saveAndClose();
            InventoryInstance.checkIsHoldingsCreated([testData.locationName]);
            InventoryInstance.waitLoading();
            InventoryInstance.openHoldingView();

            // Get holdings ID for cleanup
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingId) => {
              testData.holdingsId = holdingId;
            });

            // Step 11: ListRecords marc21 for College tenant (single-tenant harvest)
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            OaiPmhEdge.listRecordsRequest(
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
                { t: '0' },
              );
            });

            // Step 12: ListIdentifiers marc21 for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 13: ListRecords marc21_withholdings for College tenant
            OaiPmhEdge.listRecordsRequest(
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
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.marcInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 14: ListIdentifiers marc21_withholdings for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 15: ListRecords oai_dc for College tenant
            OaiPmhEdge.listRecordsRequest(
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
            });

            // Step 16: ListIdentifiers oai_dc for College tenant
            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.College),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 17: ListRecords marc21 for Central tenant (cross-tenant harvest)
            OaiPmhEdge.listRecordsRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
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
            });

            // Step 18: ListIdentifiers marc21 for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 19: ListRecords marc21_withholdings for Central tenant
            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
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
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 20: ListIdentifiers marc21_withholdings for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 21: ListRecords oai_dc for Central tenant
            OaiPmhEdge.listRecordsRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 22: ListIdentifiers oai_dc for Central tenant
            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
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
