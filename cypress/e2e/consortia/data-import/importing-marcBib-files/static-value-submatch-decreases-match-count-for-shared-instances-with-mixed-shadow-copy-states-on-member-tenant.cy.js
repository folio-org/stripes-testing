import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const postfix = getRandomPostfix();
      // Same OCLC number on both shared Instances - this is what makes the first-level match
      // ambiguous (both candidates match); the nested static-value submatch on "Suppress from
      // discovery" below is what narrows it down to exactly 1
      const oclcDigits = `1504485${randomNDigitNumber(11)}`;
      const oclcMarcValue = `(OCoLC)${oclcDigits}`;
      // Instance 1: no Holdings at the Member tenant (no shadow copy)
      const title1 = `AT_C1504485_MarcBibInstance_1_${postfix}`;
      // Instance 2: has a Holdings record at the Member tenant (shadow copy present)
      const title2 = `AT_C1504485_MarcBibInstance_2_${postfix}`;
      // The incoming file is an export of Instance 2 - the "Update MARC Bib Instance" action
      // replaces the matched instance's whole MARC source, so Instance 2 is found by this
      // title - not title2 - once the import completes
      const incomingTitle = `AT_C1504485_MarcBibInstance_Incoming_${postfix}`;
      const incomingFileName = `AT_C1504485_IncomingFile_${postfix}.mrc`;
      const oclcSearchOption = searchInstancesOptions[8];

      const mappingProfile = {
        name: `AT_C1504485 FMP Instance update to Staff suppress ${postfix}`,
      };
      const actionProfile = {
        name: `AT_C1504485 AP Instance update to Staff suppress ${postfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      };
      const matchProfile1 = {
        profileName: `AT_C1504485 MP Match on OCLC number ${postfix}`,
        incomingRecordFields: { field: '035', in1: '*', in2: '*', subfield: 'a' },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        qualifier: { comparisonPart: 'NUMERICS_ONLY' },
      };
      const matchProfile2Name = `AT_C1504485 MP Static match Suppress from discovery ${postfix}`;
      const jobProfileName = `AT_C1504485 JP Update staff suppress ${postfix}`;

      const capabSetsToAssign = [
        CapabilitySets.uiConsortiaDataImportCentralRecordUpdate,
        CapabilitySets.uiInventory,
        CapabilitySets.uiQuickMarcQuickMarcEditor,
        CapabilitySets.uiDataImport,
        CapabilitySets.uiDataImportSettingsManage,
        CapabilitySets.uiInventoryInstanceStaffSuppressedRecordsView,
      ];

      const testData = { user: {} };

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1453721_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1453721_');

        // Two shared Instances in Central tenant, same OCLC number in 035 $a
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
          { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          { tag: '035', content: `$a ${oclcMarcValue}`, indicators: ['\\', '\\'] },
          { tag: '245', content: `$a ${title1}`, indicators: ['0', '0'] },
        ]).then((instanceId) => {
          testData.instanceId1 = instanceId;
        });
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
          { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          { tag: '035', content: `$a ${oclcMarcValue}`, indicators: ['\\', '\\'] },
          { tag: '245', content: `$a ${title2}`, indicators: ['0', '0'] },
        ]).then((instanceId) => {
          testData.instanceId2 = instanceId;
          // Instance 2 is the only shared instance with this OCLC number that is suppressed
          cy.getInstanceById(instanceId).then((instance) => {
            instance.discoverySuppress = true;
            cy.updateInstance(instance);
          });
        });

        DataImport.createMarcFile({
          fileName: incomingFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [
            { tag: '035', indicators: ['\\', '\\'], content: `$a ${oclcMarcValue}` },
            { tag: '245', indicators: ['0', '0'], content: `$a ${incomingTitle}` },
          ],
        });

        // Data Import profiles below are created on the Member tenant
        cy.setTenant(Affiliations.College);

        // Mixed shadow copy states: only Instance 2 gets a Holdings record at the Member
        // tenant - Instance 1 has none
        cy.getLocations({ limit: 1, query: '(name<>"AT_*" and name<>"*auto*")' }).then(
          (location) => {
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.instanceId2,
                permanentLocationId: location.id,
                sourceId: folioSource.id,
              }).then((holdings) => {
                testData.holdingsId2 = holdings.id;
              });
            });
          },
        );

        cy.getStatisticalCodes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' })
          .then((codes) => {
            cy.getStatisticalCodeTypes({ limit: 1000 }).then((types) => {
              const codeTypeName = types.filter(
                (type) => type.id === codes[0].statisticalCodeTypeId,
              )[0].name;
              testData.statisticalCode = {
                mappingValue: `${codeTypeName}: ${codes[0].code} - ${codes[0].name}`,
                displayName: codes[0].name,
              };
            });
          })
          .then(() => {
            // FMP -> AP chain for "Instance update to Staff suppress": Staff suppress = Mark
            // for all affected records; one Statistical code selected
            SettingsFieldMappingProfiles.createMappingProfileViaApi({
              profile: {
                name: mappingProfile.name,
                incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
                mappingDetails: {
                  name: FOLIO_RECORD_TYPE.INSTANCE.toLowerCase(),
                  recordType: EXISTING_RECORD_NAMES.INSTANCE,
                  mappingFields: [
                    {
                      name: 'staffSuppress',
                      enabled: true,
                      path: 'instance.staffSuppress',
                      value: '',
                      booleanFieldAction: 'ALL_TRUE',
                      subfields: [],
                    },
                    {
                      name: 'statisticalCodeIds',
                      enabled: true,
                      path: 'instance.statisticalCodeIds[]',
                      value: '',
                      subfields: [
                        {
                          order: 0,
                          path: 'instance.statisticalCodeIds[]',
                          fields: [
                            {
                              name: 'statisticalCodeId',
                              enabled: true,
                              path: 'instance.statisticalCodeIds[]',
                              value: `"${testData.statisticalCode.mappingValue}"`,
                            },
                          ],
                        },
                      ],
                      repeatableFieldAction: 'EXTEND_EXISTING',
                    },
                  ],
                },
              },
              addedRelations: [],
              deletedRelations: [],
            }).then(({ body }) => {
              testData.mappingProfileId = body.id;
              NewActionProfile.createActionProfileViaApi(actionProfile, body.id).then(
                (apResponse) => {
                  testData.actionProfileId = apResponse.body.id;
                },
              );
            });

            // Match profile 1: "Match on OCLC number" - 035 $a, Numerics only, against
            // Instance Identifier: OCLC, Numerics only
            NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi(
              matchProfile1,
            ).then((response) => {
              testData.matchProfile1Id = response.body.id;
            });

            // Match profile 2: "Static match: Suppress from discovery" - static text "true"
            // against existing Admin Suppress from discovery
            NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi({
              profileName: matchProfile2Name,
              incomingStaticValue: 'true',
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              existingRecordOption: 'instance.discoverySuppress',
            }).then(({ body }) => {
              testData.matchProfile2Id = body.id;
            });
          })
          .then(() => {
            // Job profile: nested matches - Match on OCLC number -> for matches -> Static
            // match on Suppress from discovery -> for matches -> Instance update to Staff
            // suppress
            NewJobProfile.createJobProfileWithLinkedNestedMatchAndActionProfilesViaApi(
              jobProfileName,
              testData.matchProfile1Id,
              testData.matchProfile2Id,
              testData.actionProfileId,
            ).then((jobProfileId) => {
              testData.jobProfileId = jobProfileId;
            });
          })
          .then(() => {
            // User: primary affiliation = Member 1 (College); also has Central affiliation
            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;
              cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

              cy.resetTenant();
              cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
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
        if (testData.holdingsId2) InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingsId2);
        SettingsJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
        SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfile1Id);
        SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfile2Id);
        SettingsActionProfiles.deleteActionProfileViaApi(testData.actionProfileId);
        SettingsFieldMappingProfiles.deleteMappingProfileViaApi(testData.mappingProfileId);

        cy.resetTenant();
        if (testData.instanceId1) InventoryInstance.deleteInstanceViaApi(testData.instanceId1);
        if (testData.instanceId2) InventoryInstance.deleteInstanceViaApi(testData.instanceId2);

        FileManager.deleteFile(`cypress/fixtures/${incomingFileName}`);
      });

      it(
        'C1504485 Record match count decreases when "Static value (submatch only)" condition is applied for shared instances with mixed shadow copy states on ECS member tenant (promin)',
        { tags: ['extendedPathECS', 'promin', 'C1504485'] },
        () => {
          // Step 1: upload the incoming file and run the nested-match job profile
          DataImport.uploadFile(incomingFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileName);
          JobProfiles.runImportFile();

          // Step 2: job summary shows 1 Instance updated; no MatchingException/errors
          Logs.waitFileIsImported(incomingFileName);
          Logs.checkJobStatus(incomingFileName, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(incomingFileName);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });

          // Step 3: both shared Instances are returned when searching by the OCLC identifier.
          // Instance 2's title is now incomingTitle - the "Update MARC Bib Instance" action
          // replaced its whole MARC source with the incoming record's content
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventorySearchAndFilter.selectSearchOption(oclcSearchOption);
          InventorySearchAndFilter.fillInSearchQuery(oclcDigits);
          InventorySearchAndFilter.clickSearch();
          InventorySearchAndFilter.verifySearchResult(title1);
          InventorySearchAndFilter.verifySearchResult(incomingTitle);
          InventorySearchAndFilter.checkRowsCount(2);

          // Step 4: Instance 2 (Suppress from discovery = true, with Holdings at the Member
          // tenant) - Staff suppress = true, a Statistical code was added
          InventoryInstances.selectInstanceByTitle(incomingTitle);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode.displayName);

          // Step 5: Instance 1 (Suppress from discovery = false, without Holdings at the
          // Member tenant) is unchanged - Staff suppress = false, no Statistical code added
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventoryInstances.selectInstanceByTitle(title1);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed(false);
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode.displayName, false);
        },
      );
    });
  });
});
