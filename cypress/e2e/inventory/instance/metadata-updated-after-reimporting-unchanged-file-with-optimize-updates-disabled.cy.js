import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  PROFILE_TYPE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

// Creates a match profile via raw API call since no createMatchProfileViaApi helper exists.
// NOTE: The existingMatchExpression field labels for HOLDINGS ('callNumber') and ITEM ('barcode')
// are best-effort guesses at the internal FOLIO criterion-value-type identifiers; verify these
// against the actual data-import-profiles/matchProfiles API if the profile creation fails.
const createMatchProfileViaApi = (profileBody) => cy
  .okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/matchProfiles',
    body: profileBody,
  })
  .then(({ body }) => body);

describe('Inventory', () => {
  describe('Instance', () => {
    const postfix = getRandomPostfix();
    const testData = {
      lccnValue: `1385641${randomNDigitNumber(15)}`,
      callNumValue: `AT_C1385641_CN_${postfix}`,
      barcodeValue: generateItemBarcode(),
      instanceTitle: `AT_C1385641_MarcBibInstance_${postfix}`,
      fileName: `C1385641_marc_${postfix}.mrc`,
      updateFileName: `C1385641_marc_update_${postfix}.mrc`,
      user: {},
      profiles: {},
    };

    const capabSetsToAssign = [CapabilitySets.uiInventoryInstanceView, CapabilitySets.uiDataImport];

    before('Ensure feature is disabled, create test data and profiles via API, login', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(false);

      // Create the MARC file used for both the CREATE import and the UPDATE (re-)import.
      // 010$a = unique LCCN  →  matched by the MARC bib update match profile
      // 050$a = unique call number  →  matched by the Holdings submatch profile
      // 918$a = unique barcode  →  matched by the Item submatch profile
      DataImport.createMarcFile({
        fileName: testData.fileName,
        fields: [
          { tag: '010', content: `$a ${testData.lccnValue}`, indicators: ['\\', '\\'] },
          { tag: '050', content: `$a ${testData.callNumValue}`, indicators: ['\\', '\\'] },
          { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['1', '1'] },
          { tag: '918', content: `$a ${testData.barcodeValue}`, indicators: ['\\', '\\'] },
        ],
      });

      // Import the MARC file to create an Instance and SRS MARC record.
      DataImport.uploadFileViaApi(
        testData.fileName,
        testData.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;

        // Create Holdings (FOLIO source) linked to the Instance, with the same call number
        // value as 050$a so the Holdings submatch can find it.
        InventoryHoldings.getHoldingsFolioSource().then((source) => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((location) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instanceId,
              permanentLocationId: location.id,
              callNumber: testData.callNumValue,
              sourceId: source.id,
            }).then((holding) => {
              testData.holdingsId = holding.id;
              testData.locationName = location.name;
              testData.locationCode = location.code;

              // Create Item linked to the Holdings, with the same barcode value as 918$a.
              cy.getBookMaterialType().then(({ id: materialTypeId }) => {
                cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: testData.holdingsId,
                    barcode: testData.barcodeValue,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypes[0].id },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    testData.itemId = item.id;
                  });
                });
              });
            });
          });
        });
      });

      // ── Update job profile (all created via API) ────────────────────────────────────────
      // Unlike C1385640, this job profile also updates the Instance directly off the main
      // match (no submatch needed - no additional disambiguation condition for the Instance).
      cy.then(() => {
        const instanceMappingProfile = {
          profile: {
            name: `AT_C1385641_UpdateInstance_Mapping_${postfix}`,
            incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
            mappingDetails: {
              name: 'instance',
              recordType: EXISTING_RECORD_NAMES.INSTANCE,
              mappingFields: [],
            },
          },
        };

        const holdingsMappingProfile = {
          profile: {
            name: `AT_C1385641_UpdateHoldings_Mapping_${postfix}`,
            incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
            mappingDetails: {
              name: 'holdings',
              recordType: EXISTING_RECORD_NAMES.HOLDINGS,
              mappingFields: [
                {
                  name: 'permanentLocationId',
                  enabled: true,
                  path: 'holdings.permanentLocationId',
                  value: `"${testData.locationName} (${testData.locationCode})"`,
                },
              ],
            },
          },
        };

        const itemMappingProfile = {
          profile: {
            name: `AT_C1385641_UpdateItems_Mapping_${postfix}`,
            incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.ITEM,
            mappingDetails: {
              name: 'item',
              recordType: EXISTING_RECORD_NAMES.ITEM,
              mappingFields: [
                {
                  name: 'status.name',
                  enabled: true,
                  path: 'item.status.name',
                  value: `"${ITEM_STATUS_NAMES.AVAILABLE}"`,
                },
              ],
            },
          },
        };

        SettingsFieldMappingProfiles.createMappingProfileViaApi(instanceMappingProfile).then(
          ({ body: { id: instanceMappingProfileId } }) => {
            testData.profiles.instanceMappingProfileName = instanceMappingProfile.profile.name;

            const instanceActionProfile = {
              profile: {
                name: `AT_C1385641_UpdateInstance_Action_${postfix}`,
                action: 'UPDATE',
                folioRecord: EXISTING_RECORD_NAMES.INSTANCE,
              },
              addedRelations: [
                {
                  masterProfileId: null,
                  masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                  detailProfileId: instanceMappingProfileId,
                  detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
                },
              ],
              deletedRelations: [],
            };

            SettingsActionProfiles.createActionProfileViaApi(instanceActionProfile).then(
              ({ body: instanceActionBody }) => {
                testData.profiles.instanceActionProfileName = instanceActionProfile.profile.name;
                testData.profiles.instanceActionProfileId = instanceActionBody.id;

                SettingsFieldMappingProfiles.createMappingProfileViaApi(
                  holdingsMappingProfile,
                ).then(({ body: { id: holdingsMappingProfileId } }) => {
                  testData.profiles.holdingsMappingProfileName =
                    holdingsMappingProfile.profile.name;

                  const holdingsActionProfile = {
                    profile: {
                      name: `AT_C1385641_UpdateHoldings_Action_${postfix}`,
                      action: 'UPDATE',
                      folioRecord: EXISTING_RECORD_NAMES.HOLDINGS,
                    },
                    addedRelations: [
                      {
                        masterProfileId: null,
                        masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                        detailProfileId: holdingsMappingProfileId,
                        detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
                      },
                    ],
                    deletedRelations: [],
                  };

                  SettingsActionProfiles.createActionProfileViaApi(holdingsActionProfile).then(
                    ({ body: holdingsActionBody }) => {
                      testData.profiles.holdingsActionProfileName =
                        holdingsActionProfile.profile.name;
                      testData.profiles.holdingsActionProfileId = holdingsActionBody.id;

                      SettingsFieldMappingProfiles.createMappingProfileViaApi(
                        itemMappingProfile,
                      ).then(({ body: { id: itemMappingProfileId } }) => {
                        testData.profiles.itemMappingProfileName = itemMappingProfile.profile.name;

                        const itemActionProfile = {
                          profile: {
                            name: `AT_C1385641_UpdateItems_Action_${postfix}`,
                            action: 'UPDATE',
                            folioRecord: EXISTING_RECORD_NAMES.ITEM,
                          },
                          addedRelations: [
                            {
                              masterProfileId: null,
                              masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                              detailProfileId: itemMappingProfileId,
                              detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
                            },
                          ],
                          deletedRelations: [],
                        };

                        SettingsActionProfiles.createActionProfileViaApi(itemActionProfile).then(
                          ({ body: itemActionBody }) => {
                            testData.profiles.itemActionProfileName =
                              itemActionProfile.profile.name;
                            testData.profiles.itemActionProfileId = itemActionBody.id;

                            // Match profiles ───────────────────────────────────────────────
                            // Main: MARC bib 010$a → existing MARC bib 010$a
                            const marcBibMatchBody = {
                              profile: {
                                name: `AT_C1385641_MarcBib010Match_${postfix}`,
                                incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                matchDetails: [
                                  {
                                    incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                    existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                    incomingMatchExpression: {
                                      fields: [
                                        { label: 'field', value: '010' },
                                        { label: 'indicator1', value: '*' },
                                        { label: 'indicator2', value: '*' },
                                        { label: 'recordSubfield', value: 'a' },
                                      ],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                    matchCriterion: 'EXACTLY_MATCHES',
                                    existingMatchExpression: {
                                      fields: [
                                        { label: 'field', value: '010' },
                                        { label: 'indicator1', value: '*' },
                                        { label: 'indicator2', value: '*' },
                                        { label: 'recordSubfield', value: 'a' },
                                      ],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                  },
                                ],
                              },
                              addedRelations: [],
                              deletedRelations: [],
                            };

                            // Submatch: MARC bib 050$a → Holdings call number
                            // NOTE: 'holdingsrecord.callNumber' is a best-guess field label.
                            // Verify if this profile fails to create.
                            const holdingsMatchBody = {
                              profile: {
                                name: `AT_C1385641_Holdings050Match_${postfix}`,
                                incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
                                matchDetails: [
                                  {
                                    incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                    existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
                                    incomingMatchExpression: {
                                      fields: [
                                        { label: 'field', value: '050' },
                                        { label: 'indicator1', value: '*' },
                                        { label: 'indicator2', value: '*' },
                                        { label: 'recordSubfield', value: 'a' },
                                      ],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                    matchCriterion: 'EXACTLY_MATCHES',
                                    existingMatchExpression: {
                                      fields: [
                                        {
                                          label: 'field',
                                          value: 'holdingsrecord.callNumber',
                                        },
                                      ],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                  },
                                ],
                              },
                              addedRelations: [],
                              deletedRelations: [],
                            };

                            // Submatch: MARC bib 918$a → Item barcode
                            // NOTE: 'item.barcode' is a best-guess field label. Verify if
                            // this profile fails to create.
                            const itemMatchBody = {
                              profile: {
                                name: `AT_C1385641_Item918Match_${postfix}`,
                                incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                existingRecordType: EXISTING_RECORD_NAMES.ITEM,
                                matchDetails: [
                                  {
                                    incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                                    existingRecordType: EXISTING_RECORD_NAMES.ITEM,
                                    incomingMatchExpression: {
                                      fields: [
                                        { label: 'field', value: '918' },
                                        { label: 'indicator1', value: '*' },
                                        { label: 'indicator2', value: '*' },
                                        { label: 'recordSubfield', value: 'a' },
                                      ],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                    matchCriterion: 'EXACTLY_MATCHES',
                                    existingMatchExpression: {
                                      fields: [{ label: 'field', value: 'item.barcode' }],
                                      dataValueType: 'VALUE_FROM_RECORD',
                                    },
                                  },
                                ],
                              },
                              addedRelations: [],
                              deletedRelations: [],
                            };

                            createMatchProfileViaApi(marcBibMatchBody).then((marcBibMatch) => {
                              testData.profiles.marcBibMatchProfileName =
                                marcBibMatchBody.profile.name;
                              testData.profiles.marcBibMatchProfileId = marcBibMatch.id;

                              createMatchProfileViaApi(holdingsMatchBody).then((holdingsMatch) => {
                                testData.profiles.holdingsMatchProfileName =
                                  holdingsMatchBody.profile.name;
                                testData.profiles.holdingsMatchProfileId = holdingsMatch.id;

                                createMatchProfileViaApi(itemMatchBody).then((itemMatch) => {
                                  testData.profiles.itemMatchProfileName =
                                    itemMatchBody.profile.name;
                                  testData.profiles.itemMatchProfileId = itemMatch.id;

                                  // Job profile for update:
                                  //   Main: MARC bib 010$a match
                                  //   For matches:
                                  //     - direct action: Update Instance
                                  //     - Holdings 050$a submatch → Update Holdings action
                                  //     - Item 918$a submatch → Update Items action
                                  const updateJobProfile = {
                                    profile: {
                                      name: `AT_C1385641_Update_JobProfile_${postfix}`,
                                      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
                                    },
                                    addedRelations: [
                                      // Job → main MARC bib match
                                      {
                                        masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
                                        detailProfileId: marcBibMatch.id,
                                        detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        order: 0,
                                      },
                                      // main match → Update Instance action (direct)
                                      {
                                        masterProfileId: marcBibMatch.id,
                                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        detailProfileId: testData.profiles.instanceActionProfileId,
                                        detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                                        order: 0,
                                        reactTo: 'MATCH',
                                      },
                                      // main match → Holdings submatch
                                      {
                                        masterProfileId: marcBibMatch.id,
                                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        detailProfileId: holdingsMatch.id,
                                        detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        order: 1,
                                        reactTo: 'MATCH',
                                      },
                                      // Holdings submatch → Update Holdings action
                                      {
                                        masterProfileId: holdingsMatch.id,
                                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        detailProfileId: testData.profiles.holdingsActionProfileId,
                                        detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                                        order: 0,
                                        reactTo: 'MATCH',
                                      },
                                      // main match → Item submatch
                                      {
                                        masterProfileId: marcBibMatch.id,
                                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        detailProfileId: itemMatch.id,
                                        detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        order: 2,
                                        reactTo: 'MATCH',
                                      },
                                      // Item submatch → Update Items action
                                      {
                                        masterProfileId: itemMatch.id,
                                        masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
                                        detailProfileId: testData.profiles.itemActionProfileId,
                                        detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                                        order: 0,
                                        reactTo: 'MATCH',
                                      },
                                    ],
                                    deletedRelations: [],
                                  };

                                  SettingsJobProfiles.createJobProfileViaApi(updateJobProfile).then(
                                    ({ body: jobBody }) => {
                                      testData.profiles.updateJobProfileName =
                                        updateJobProfile.profile.name;
                                      testData.profiles.updateJobProfileId = jobBody.id;
                                    },
                                  );
                                });
                              });
                            });
                          },
                        );
                      });
                    },
                  );
                });
              },
            );
          },
        );
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

        cy.wait(60_000); // wait to make sure time of update would have been different by minutes
        cy.getAdminToken(false);

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data and profiles', () => {
      cy.getAdminToken(false);
      // NOTE: "Prevent redundant updates" was only set to its already-default (disabled) value
      // above, so there's nothing to restore here.
      if (testData.profiles.updateJobProfileName) {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.profiles.updateJobProfileName);
      }
      if (testData.profiles.marcBibMatchProfileName) {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
          testData.profiles.marcBibMatchProfileName,
        );
      }
      if (testData.profiles.holdingsMatchProfileName) {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
          testData.profiles.holdingsMatchProfileName,
        );
      }
      if (testData.profiles.itemMatchProfileName) {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
          testData.profiles.itemMatchProfileName,
        );
      }
      if (testData.profiles.instanceActionProfileName) {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(
          testData.profiles.instanceActionProfileName,
        );
      }
      if (testData.profiles.holdingsActionProfileName) {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(
          testData.profiles.holdingsActionProfileName,
        );
      }
      if (testData.profiles.itemActionProfileName) {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(
          testData.profiles.itemActionProfileName,
        );
      }
      if (testData.profiles.instanceMappingProfileName) {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          testData.profiles.instanceMappingProfileName,
        );
      }
      if (testData.profiles.holdingsMappingProfileName) {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          testData.profiles.holdingsMappingProfileName,
        );
      }
      if (testData.profiles.itemMappingProfileName) {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          testData.profiles.itemMappingProfileName,
        );
      }
      Users.deleteViaApi(testData.user.userId);
      InventoryItems.deleteItemViaApi(testData.itemId);
      cy.deleteHoldingRecordViaApi(testData.holdingsId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
    });

    it(
      'C1385641 Instance, Holdings, and Item metadata is updated after re-importing an unchanged file when Prevent redundant updates in Inventory is disabled (promin)',
      { tags: ['extendedPath', 'promin', 'C1385641'] },
      () => {
        // Navigate to the Instance created in before() and note the initial "Record last updated"
        // timestamps for Instance, Holdings, and Item before running the update import.
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Note Instance "Record last updated"
        cy.contains('button', /Record last updated:/)
          .first()
          .invoke('text')
          .then((instanceTimestamp) => {
            // Note Holdings "Record last updated"
            InventoryInstance.openHoldings([testData.locationName]);
            InstanceRecordView.openHoldingView(false);
            HoldingsRecordView.waitLoading();

            cy.contains('button', /Record last updated:/)
              .first()
              .invoke('text')
              .then((holdingsTimestamp) => {
                // Note Item "Record last updated"
                // Close Holdings detail pane → back to Instance view → re-expand Holdings
                // → then open Item (Item link is only accessible from the Holdings accordion)
                HoldingsRecordView.close();
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();
                InventoryInstance.openHoldings([testData.locationName]);
                InventoryInstance.openItemByBarcode(testData.barcodeValue);
                ItemRecordView.waitLoading();
                ItemRecordView.expandAll();

                cy.contains('button', /Record last updated:/)
                  .first()
                  .invoke('text')
                  .then((itemTimestamp) => {
                    const instanceDate = instanceTimestamp.split('updated: ')[1];
                    const itemDate = itemTimestamp.split('updated: ')[1];

                    // Close the Item pane before leaving Inventory so the restored state on
                    // return is the Instance view (not a full-screen Item pane).
                    ItemRecordView.closeItemEditForm();
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

                    // Step 1: Import the same file with the update job profile
                    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
                    DataImport.verifyUploadState();
                    DataImport.uploadFile(testData.fileName, testData.updateFileName);
                    JobProfiles.waitFileIsUploaded();
                    JobProfiles.search(testData.profiles.updateJobProfileName);
                    JobProfiles.runImportFile();
                    Logs.waitFileIsImported(testData.updateFileName);
                    Logs.checkJobStatus(testData.updateFileName, JOB_STATUS_NAMES.COMPLETED);

                    // Step 2: Navigate to the Instance and verify "Record last updated" is
                    // newer than the original (optimize-updates disabled, so the actual
                    // metadata was modified by this import even though no field values changed)
                    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
                    InventoryInstances.waitContentLoading();
                    InventoryInstances.searchByTitle(testData.instanceId);
                    InventoryInstances.selectInstanceById(testData.instanceId);
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InstanceRecordView.verifyLastUpdatedDateAndTime(instanceDate, {
                      matches: false,
                    });

                    // Step 3: Holdings "Record last updated" is newer
                    InventoryInstance.openHoldings([testData.locationName]);
                    InstanceRecordView.openHoldingView(false);
                    HoldingsRecordView.waitLoading();
                    cy.contains('button', /Record last updated:/)
                      .first()
                      .invoke('text')
                      .then((holdingsTimestampAfter) => {
                        expect(holdingsTimestampAfter).to.not.equal(holdingsTimestamp);
                      });

                    // Step 4: Item "Record last updated" is newer
                    // Close Holdings pane → back to Instance view → re-expand Holdings → open Item
                    HoldingsRecordView.close();
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InventoryInstance.openHoldings([testData.locationName]);
                    InventoryInstance.openItemByBarcode(testData.barcodeValue);
                    ItemRecordView.waitLoading();
                    ItemRecordView.expandAll();
                    ItemRecordView.verifyLastUpdatedDateAndTime(itemDate, { matches: false });
                  });
              });
          });
      },
    );
  });
});
