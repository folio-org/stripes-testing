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
    marc: 'marcBibFileForC402361.mrc',
    fileName: `C402361_testMarcFile${getRandomPostfix()}.mrc`,
  },
  instanceTitle: 'AT_C402361_MarcInstance',
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
const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');
const userPermissions = [
  Permissions.moduleDataImportEnabled.gui,
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
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
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Get location for holdings from College tenant
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
        });

        cy.resetTenant();

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // Delete holdings from College tenant where they were created
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Delete instance from Central tenant where it was created
        cy.resetTenant();
        if (testData.marcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402361 Consortia | SRS | GetRecord: Add shared MARC instance to Central tenant and enrich it with local FOLIO Holdings in Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402361', 'nonParallel'] },
        () => {
          // Step 1: Login and navigate to Data Import in Central tenant
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          // Step 2-3: Upload MARC file and run default job profile
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.fileName);

          // Step 4: Verify import completed successfully
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

          // Step 6: View source and extract UUID from 999 field
          InventoryInstance.viewSource();
          InventoryViewSource.extructDataFrom999Field().then((result) => {
            testData.marcInstance = {
              uuid: result[0],
            };
            InventoryViewSource.close();

            // Step 7: Switch to member tenant and search for the instance
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.marcInstance.uuid);
            InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

            // Step 8: Add holdings record with call number, electronic access, and location
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

            // Capture holdings ID for cleanup
            InventoryInstance.openHoldingView();
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              testData.holdingsId = holdingsID;
            });
            HoldingsRecordView.close();

            // Step 10: Verify GetRecord response with marc21 metadata format
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
                { ind1: '0', ind2: '4' },
                { a: testData.instanceTitle },
              );
            });

            // Step 11: Verify GetRecord response with marc21_withholdings metadata format
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
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.marcInstance.uuid,
                '856',
                { ind1: '4', ind2: '0' },
                {
                  u: testData.electronicAccessData.uri,
                  y: testData.electronicAccessData.linkText,
                  3: testData.electronicAccessData.materialsSpecified,
                  z: testData.electronicAccessData.publicNote,
                },
              );
            });

            // Step 12: Verify GetRecord response with oai_dc metadata format
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
                title: testData.instanceTitle,
              });
            });
          });
        },
      );
    });
  });
});
