import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
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
    const titlePrefix = `AT_C451484_FolioInstance_${randomPostfix}`;
    // 035$a (unlike 001/HRID) is NOT system-generated, so both instances below can genuinely
    // share one value - this is what makes the 035 match find "multiple result instance"
    // (see pattern_marc_bib_001_system_generated memory - 001 can't be controlled this way)
    const shared035Value = `AT_C451484_${randomPostfix}`;

    const updateMarcFileName = `AT_C451484_update_${randomPostfix}.mrc`;
    const importedFileName = `AT_C451484_importedFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C451484_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C451484_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
    };
    const matchProfile035 = {
      profileName: `AT_C451484_035MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '035', in1: '', in2: '', subfield: 'a' },
      existingRecordFields: { field: '035', in1: '', in2: '', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const holdingsSubmatchProfileName = `AT_C451484_HoldingsLocationSubmatch_${randomPostfix}`;
    const jobProfile = { profileName: `AT_C451484_JobProfile_${randomPostfix}` };

    const testData = {};
    let instanceId1;
    let instanceId2;
    let user;

    before('Create test data via API', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C451484_');

      cy.then(() => {
        // Any active, non-test-owned location works here - the submatch only ever evaluates
        // holdings belonging to the 2 instances this test's own 035 match finds, so there's no
        // need for a dedicated test-owned location like the facet-counter family uses
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

        // 2 separate Instances sharing the same 035$a - the "multiple result instance"
        // condition for the 035 match
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
          { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
          { tag: '035', content: `$a ${shared035Value}` },
          { tag: '245', content: `$a ${titlePrefix}_1`, indicators: ['0', '0'] },
        ]).then((createdInstanceId) => {
          instanceId1 = createdInstanceId;
        });
      })
        .then(() => {
          return cy
            .createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
              { tag: '035', content: `$a ${shared035Value}` },
              { tag: '245', content: `$a ${titlePrefix}_2`, indicators: ['0', '0'] },
            ])
            .then((createdInstanceId) => {
              instanceId2 = createdInstanceId;
            });
        })
        .then(() => {
          // Add Holdings with the fetched location to the FIRST instance only - the second
          // instance has no Holdings at all, so among the holdings of these 2 matched
          // instances, only this one can match the location submatch below
          return InventoryHoldings.createHoldingRecordViaApi({
            instanceId: instanceId1,
            permanentLocationId: testData.location.id,
            sourceId: testData.sourceId,
          });
        })
        .then(() => {
          // The update file only needs the matching 035$a - the actual change comes from the
          // job profile's Update action (Holdings type), not from the MARC content itself
          DataImport.createMarcFile({
            fileName: updateMarcFileName,
            recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            fields: [{ tag: '035', content: `$a ${shared035Value}` }],
          });
        })
        .then(() => {
          // Profiles: mapping (MARC Bib -> Holdings, set Holdings type), action (UPDATE,
          // FOLIO record type Instance per TestRail), match 1 (035$a to 035$a MARC Bib), match
          // 2 (submatch: static value = location name -> existing Holdings record's Permanent
          // location), job profile chaining match1 -> match2 -> action
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
                matchProfile035,
              ).then((mp1Response) => {
                matchProfile035.id = mp1Response.body.id;

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
                    matchProfile035.id,
                    mp2Body.id,
                    actionProfile.id,
                  );
                });
              });
            });
          });
        })
        .then(() => {
          // Import the update file via the newly-built job profile
          return DataImport.uploadFileViaApi(
            updateMarcFileName,
            importedFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
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
        InventoryInstance.deleteInstanceViaApi(instanceId1);
        InventoryInstance.deleteInstanceViaApi(instanceId2);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile035.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsSubmatchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        FieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${updateMarcFileName}`);
      });
    });

    it(
      'C451484 Updating of multiple result instance with 035 and holdings submatch (promin)',
      { tags: ['edgeCases', 'promin', 'C451484'] },
      () => {
        // Steps 13-14: the update job completed; even though the 035 match found both
        // Instances, the holdings-location submatch narrowed the Update action to just the
        // one Holdings record with the matching location
        Logs.waitFileIsImported(importedFileName);
        Logs.checkJobStatus(importedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(importedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );

        // Step 15: open the updated Holdings record in Inventory
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.waitLoading();

        // Step 16: Holdings type was updated to the value selected in the mapping profile
        HoldingsRecordView.checkHoldingsType(testData.holdingsTypeName);
      },
    );
  });
});
