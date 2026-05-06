import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
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
  marcFile: {
    marc: 'marcBibFileForC402370.mrc',
    fileName: `C402370_testMarcFile${getRandomPostfix()}.mrc`,
  },
  instanceTitle: 'AT_C402370_LocalMarcInstance',
  marcInstance: {
    uuid: null,
  },
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

        // Configure OAI-PMH behavior for College tenant with SRS source
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Configure OAI-PMH behavior for University tenant with SRS source
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Configure OAI-PMH behavior for Central tenant with SRS source
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });

          // Login and switch to College tenant
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete instance from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
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
        'C402370 Consortia | SRS | ListRecords | ListIdentifiers: Add local MARC instance to Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402370', 'nonParallel'] },
        () => {
          // Step 1: Upload MARC file
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
          JobProfiles.waitFileIsUploaded();

          // Step 2: Select \"Default - Create instance and SRS MARC Bib\" job profile
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

            // Step 8: ListRecords marc21 for College tenant (single-tenant harvest)
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

            // Step 9: ListIdentifiers marc21 for College tenant
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

            // Step 10: ListRecords marc21_withholdings for College tenant
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
            });

            // Step 11: ListIdentifiers marc21_withholdings for College tenant
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

            // Step 12: ListRecords oai_dc for College tenant
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

            // Step 13: ListIdentifiers oai_dc for College tenant
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

            // Step 14: ListRecords marc21 for Central tenant (cross-tenant harvest)
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

            // Step 15: ListIdentifiers marc21 for Central tenant
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

            // Step 16: ListRecords marc21_withholdings for Central tenant
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
            });

            // Step 17: ListIdentifiers marc21_withholdings for Central tenant
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

            // Step 18: ListRecords oai_dc for Central tenant
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

            // Step 19: ListIdentifiers oai_dc for Central tenant
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
