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
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const bibTitle = `AT_C788744_MarcBibInstance_${randomPostfix}`;
      const holdingsFileName = 'marcHoldingsFileForC788744.mrc';
      const editedMarcFileName = `AT_C788744_MarcHoldingsFile_${randomPostfix}.mrc`;
      const tag868UpdatedContent = `AT_C788744_868_${randomPostfix}`;

      const testData = {
        tag004: '004',
        tag852: '852',
        tag868: '868',
        user: {},
        instanceId: null,
        instanceHrid: null,
        locationCode: null,
      };

      const memberPermissions = [
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ];
      const centralPermissions = [Permissions.uiInventoryViewInstances.gui];

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C788744_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C788744_');

        cy.then(() => {
          // Create a shared "MARC bibliographic" record in Central tenant
          cy.createSimpleMarcBibViaAPI(bibTitle).then((instanceId) => {
            testData.instanceId = instanceId;
            cy.getInstanceById(instanceId).then((instanceData) => {
              testData.instanceHrid = instanceData.hrid;
            });
          });
        })
          .then(() => {
            // Get an existing location code from Member 1 (College) tenant
            cy.setTenant(Affiliations.College);
            cy.getLocations({ limit: 1, query: '(name<>"AT_*" and name<>"*auto*")' }).then(
              (location) => {
                testData.locationCode = location.code;
              },
            );
          })
          .then(() => {
            // Replace "004" (Instance HRID) and "852 $b" (Location code) placeholders
            DataImport.editMarcFile(
              holdingsFileName,
              editedMarcFileName,
              ['BIBHRIDHERE', 'LOCCODE'],
              [testData.instanceHrid, testData.locationCode],
            );
          })
          .then(() => {
            // User: primary affiliation = Member 1 (College); also has Central affiliation
            cy.createTempUser(memberPermissions).then((userProperties) => {
              testData.user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.user.userId, centralPermissions);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(bibTitle);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(bibTitle);

        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      });

      it(
        'C788744 Import MARC holdings for Shared Instance from Member tenant (promin)',
        { tags: ['criticalPathECS', 'promin', 'C788744'] },
        () => {
          // Step 1: Import MARC holdings file using "Default - Create Holdings and SRS MARC Holdings" job profile
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(editedMarcFileName);
          Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);

          // Step 2: Open file details; verify "Created" in SRS MARC and Holdings columns
          Logs.openFileDetails(editedMarcFileName);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.holdings,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
          });

          // Step 3: Click "Created" hyperlink in Holdings column - Holdings detail view opens
          FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
          HoldingsRecordView.waitLoading();

          // Step 4: Actions > View source - verify 004/852 placeholders were replaced correctly
          HoldingsRecordView.viewSource();
          InventoryViewSource.waitHoldingLoading();
          InventoryViewSource.checkFieldContentMatch(
            testData.tag004,
            new RegExp(testData.instanceHrid),
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag852,
            `$b ${testData.locationCode}`,
          );
          InventoryViewSource.close();

          // Step 5: Actions > Edit in quickMARC - editing window is displayed
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Step 6: Update 868 field - Save & keep editing/Save & close buttons become enabled
          QuickMarcEditor.updateExistingField(testData.tag868, `$8 0 $a ${tag868UpdatedContent}`);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          // Step 7: Save & keep editing - success toast is shown, Edit MARC holdings pane stays open
          QuickMarcEditor.clickSaveAndKeepEditing();
        },
      );
    });
  });
});
