import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C451482_FolioInstance_${randomPostfix}`;

    const csvFileName = `AT_C451482_export_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C451482_exportedMarc_${randomPostfix}.mrc`;
    const importedFileName = `AT_C451482_importedFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C451482_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C451482_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
    };
    const matchProfile001 = {
      profileName: `AT_C451482_001MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
      existingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const holdingsSubmatchProfileName = `AT_C451482_HoldingsLocationSubmatch_${randomPostfix}`;
    const jobProfile = { profileName: `AT_C451482_JobProfile_${randomPostfix}` };

    const testData = {};
    let instanceId;
    let user;

    before('Create test data via API', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C451482_');

      cy.then(() => {
        // Any active, non-test-owned location works here - the submatch only ever evaluates
        // holdings belonging to the one instance this test's own 001 match finds, so there's
        // no need for a dedicated test-owned location like the facet-counter family uses
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then(
          (location) => {
            testData.location = location;
          },
        );

        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingsTypeName = holdingTypes[0].name;
        });

        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });

        // Create the MARC Bib record - 001 is system-generated (it becomes the Instance's
        // HRID) and can't be set directly; this is fine, since the match below just needs the
        // record's OWN 001 to round-trip unchanged through an export + unmodified re-import
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
          { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
          { tag: '245', content: `$a ${titlePrefix}`, indicators: ['0', '0'] },
        ]).then((createdInstanceId) => {
          instanceId = createdInstanceId;
        });
      })
        .then(() => {
          // Add Holdings with the fetched location
          return InventoryHoldings.createHoldingRecordViaApi({
            instanceId,
            permanentLocationId: testData.location.id,
            sourceId: testData.sourceId,
          });
        })
        .then(() => {
          // Export the Instance - the exported file's 001 is whatever the system actually
          // assigned; it's never read or edited, just re-imported unmodified below
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceId);
        })
        .then(() => {
          return ExportFile.exportFileViaApi(csvFileName).then(() => {
            return ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          // Profiles: mapping (MARC Bib -> Holdings, set Holdings type), action (UPDATE
          // Holdings), match 1 (001-to-001 MARC Bib), match 2 (submatch: static value =
          // location name -> existing Holdings record's Permanent location), job profile
          // chaining match1 -> match2 -> action
          return FieldMappingProfiles.createMappingProfileViaApi(
            FieldMappingProfiles.getDefaultMappingProfile({
              incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
              name: mappingProfile.name,
              mappingFieldsData: [
                {
                  name: 'holdingsTypeId',
                  value: `"${testData.holdingsTypeName}"`,
                  acceptedValues: {},
                },
              ],
            }),
          ).then(({ body }) => {
            mappingProfile.id = body.id;

            return NewActionProfile.createActionProfileViaApi(
              actionProfile,
              mappingProfile.id,
            ).then((apResponse) => {
              actionProfile.id = apResponse.body.id;

              return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                matchProfile001,
              ).then((mp1Response) => {
                matchProfile001.id = mp1Response.body.id;

                return NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi(
                  {
                    profileName: holdingsSubmatchProfileName,
                    incomingStaticValue: testData.location.name,
                    existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
                    existingRecordOption: 'holdingsrecord.permanentLocationId',
                  },
                ).then(({ body: mp2Body }) => {
                  return NewJobProfile.createJobProfileWithLinkedNestedMatchAndActionProfilesViaApi(
                    jobProfile.profileName,
                    matchProfile001.id,
                    mp2Body.id,
                    actionProfile.id,
                  );
                });
              });
            });
          });
        })
        .then(() => {
          // Re-import the exported file UNMODIFIED via the new job profile - 001 matches the
          // same Instance it came from, and the only actual change comes from the Update
          // action (Holdings type), not from the MARC content itself
          return DataImport.uploadFileViaApi(
            exportedMarcFileName,
            importedFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile001.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsSubmatchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
        FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
      });
    });

    it(
      'C451482 Updating of multiple result instance with 001 and holdings submatch (promin)',
      { tags: ['edgeCases', 'promin', 'C451482'] },
      () => {
        // Steps 14-16: the update job completed; the 001 match found the Instance and the
        // holdings-location submatch narrowed the Update action to its Holdings record
        Logs.waitFileIsImported(importedFileName);
        Logs.checkJobStatus(importedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(importedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );

        // Step 17: open the updated Holdings record in Inventory
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.waitLoading();

        // Step 18: Holdings type was updated to the value selected in the mapping profile
        HoldingsRecordView.checkHoldingsType(testData.holdingsTypeName);
      },
    );
  });
});
