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
    marc: 'marcBibFileForC402367.mrc',
    fileName: `C402367_testMarcFile${getRandomPostfix()}.mrc`,
  },
  instanceTitle: 'AT_C402367_LocalMarcInstance',
};
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

        // Configure OAI-PMH behavior for College tenant with SRS source
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        cy.resetTenant();

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
        cy.setTenant(Affiliations.College);
        if (testData.marcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402367 Consortia | SRS | GetRecord: Add local MARC instance to Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402367', 'nonParallel'] },
        () => {
          // Step 1: Go to Data import app and upload MARC file
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
          JobProfiles.waitFileIsUploaded();

          // Step 2: Click on Default - Create instance and SRS MARC Bib job profile
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS);

          // Step 3: Click Actions => Run
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.fileName);

          // Step 4: Verify import completed and click on File name
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

          // Step 5: Click on Created hyperlink in Instance column
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

          // Step 6: Click Actions => View source
          InventoryInstance.viewSource();

          // Step 7: Note UUID from 999 field subfield i
          InventoryViewSource.extructDataFrom999Field().then((result) => {
            testData.marcInstance = {
              uuid: result[0],
            };
            InventoryViewSource.close();

            // Step 8: Verify GetRecord response with marc21 metadata format
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

            // Step 9: Verify GetRecord response with marc21_withholdings metadata format
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

            // Step 10: Verify GetRecord response with oai_dc metadata format
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
                title: testData.instanceTitle,
              });
            });
          });
        },
      );
    });
  });
});
