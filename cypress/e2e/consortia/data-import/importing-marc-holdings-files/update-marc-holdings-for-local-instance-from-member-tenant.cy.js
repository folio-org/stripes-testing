import {
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const bibTitle = `AT_C788747_MarcBibInstance_${randomPostfix}`;
      const csvFileName = `AT_C788747_HoldingsIdentifiers_${randomPostfix}.csv`;
      const exportedFileName = `AT_C788747_ExportedHoldings_${randomPostfix}.mrc`;
      const editedFileName = `AT_C788747_UpdatedHoldings_${randomPostfix}.mrc`;
      const seed562Value = `AT_C788747_Seed562_${randomPostfix}`;
      const updated562Value = `AT_C788747_Updated562_${randomPostfix}`;
      const updated852XValue = `AT_C788747_Updated852X_${randomPostfix}`;

      const testData = { user: {} };

      const memberPermissions = [
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ];
      const centralPermissions = [Permissions.uiInventoryViewInstances.gui];

      const mappingProfile = { name: `AT_C788747 FMP MARC Holdings Update ${randomPostfix}` };
      const actionProfile = {
        name: `AT_C788747 AP MARC Holdings Update ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      };
      const matchProfile = {
        profileName: `AT_C788747 MP MARC Holdings 999 $s ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      };
      const jobProfile = { profileName: `AT_C788747 JP MARC Holdings Update ${randomPostfix}` };

      let instanceId;
      let instanceHrid;
      let holdingsId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C788747_');

        cy.then(() => {
          // Local (not shared) MARC bib, created directly in Member 1 (College)
          cy.createSimpleMarcBibViaAPI(bibTitle).then((id) => {
            instanceId = id;
            cy.getInstanceById(id).then((instanceData) => {
              instanceHrid = instanceData.hrid;
            });
          });
        })
          .then(() => {
            cy.getLocations({ limit: 1, query: '(name<>"AT_*" and name<>"*auto*")' }).then(
              (location) => {
                locationCode = location.code;
              },
            );
          })
          .then(() => {
            // Seed a 562 field so the incoming file's 562 edit is a genuine UPDATE of an
            // existing occurrence, not an ADD (there's nothing to "edit by tag" otherwise)
            cy.createMarcHoldingsViaAPI(instanceId, [
              { tag: '004', content: instanceHrid },
              { tag: '008', content: QuickMarcEditor.defaultValid008HoldingsValues },
              { tag: '562', content: `$a ${seed562Value}`, indicators: ['\\', '\\'] },
              { tag: '852', content: `$b ${locationCode}`, indicators: ['\\', '\\'] },
            ]).then((id) => {
              holdingsId = id;
            });
          })
          .then(() => {
            // Export the record's MARC and edit it into the incoming update file. The exported
            // record already has a genuine 999 ff $s (auto-generated by SRS), so it's used as-is
            // for the match key - no need to add or inject one
            FileManager.createFile(`cypress/fixtures/${csvFileName}`, holdingsId);
            ExportFile.exportFileViaApi(
              csvFileName,
              'holding',
              DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
            ).then(() => {
              ExportFile.downloadExportedMarcFile(exportedFileName);
              DataImport.editMarcFieldsInAllRecords(exportedFileName, editedFileName, {
                editFields: [
                  { tag: '562', content: `$a ${updated562Value}` },
                  { tag: '852', content: `$b ${locationCode} $x ${updated852XValue}` },
                ],
              });
            });
          })
          .then(() => {
            // Update job profile chain: FMP -> AP -> MP -> JP, matching on 999 ff $s, created in
            // Member 1 (College) tenant since that's where the import will run
            SettingsFieldMappingProfiles.createMappingProfileViaApi({
              profile: {
                name: mappingProfile.name,
                incomingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
                existingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
                description: '',
                mappingDetails: {
                  name: 'marcHoldings',
                  recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
                  marcMappingOption: 'UPDATE',
                  mappingFields: [],
                },
              },
              addedRelations: [],
              deletedRelations: [],
            })
              .then(({ body }) => NewActionProfile.createActionProfileViaApi(actionProfile, body.id))
              .then((apResponse) => {
                const apId = apResponse.body.id;
                return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                  matchProfile,
                ).then((mpResponse) => NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  mpResponse.body.id,
                  apId,
                ));
              });
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
            // Run the update import via API, as the actor user, in Member 1 (College) tenant -
            // this covers preconditions/steps 1-13 entirely via API
            cy.setTenant(Affiliations.College);
            cy.getToken(testData.user.username, testData.user.password);
            DataImport.uploadFileViaApi(editedFileName, editedFileName, jobProfile.profileName);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        InventoryInstances.deleteFullInstancesByTitleViaApi(bibTitle);

        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
        FileManager.deleteFile(`cypress/downloads/${exportedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      });

      it(
        'C788747 Update MARC holdings which belongs to Local Instance from Member tenant (promin)',
        { tags: ['backend', 'promin', 'C788747'] },
        () => {
          // Step 13 (verified in UI): login lands directly on Data Import at Member 1 (College) -
          // the API-triggered import job already shows "Completed"
          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          Logs.waitFileIsImported(editedFileName);
          Logs.checkJobStatus(editedFileName, JOB_STATUS_NAMES.COMPLETED);

          // Step 14: SRS MARC and Holdings both show "Updated", "1" in the Updated row (row 1)
          Logs.openFileDetails(editedFileName);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.holdings,
          );
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
          FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);

          // Step 15: click the "Updated" hyperlink - Holdings detail view opens via Inventory,
          // header shows the parent instance's title
          FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkInstanceTitle(bibTitle);

          // Step 16: Edit in quickMARC - page opens with both updates from the incoming file
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag('562', `$a ${updated562Value}`);
          QuickMarcEditor.checkContentByTag('852', `$b ${locationCode} $x ${updated852XValue}`);
        },
      );
    });
  });
});
