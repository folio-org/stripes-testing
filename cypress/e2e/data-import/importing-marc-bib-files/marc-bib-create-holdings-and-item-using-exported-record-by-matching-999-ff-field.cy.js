import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const csvFileName = `C359013_exportList${randomPostfix}.csv`;
    const exportedMarcFileName = `C359013_exportedMarc${randomPostfix}.mrc`;

    const mappingProfiles = {
      holdings: { name: `AT_C359013_HoldingsMappingProfile_${randomPostfix}` },
      item: { name: `AT_C359013_ItemMappingProfile_${randomPostfix}` },
    };

    const actionProfiles = {
      holdings: {
        name: `AT_C359013_HoldingsActionProfile_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      },
      item: {
        name: `AT_C359013_ItemActionProfile_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.ITEM,
      },
    };

    const matchProfile = {
      profileName: `AT_C359013_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 'i' },
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.id',
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };

    const jobProfile = { profileName: `AT_C359013_JobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();

      cy.getStatisticalCodes({ query: 'name<>"*auto*"', limit: 1 })
        .then((codes) => {
          return cy.getStatisticalCodeTypes({ limit: 1000 }).then((types) => {
            const typeName = types.find((t) => t.id === codes[0].statisticalCodeTypeId).name;
            testData.statCode = {
              id: codes[0].id,
              displayName: `${typeName}: ${codes[0].code} - ${codes[0].name}`,
            };
          });
        })
        .then(() => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            testData.locationName = res.name;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then(
            (loanTypes) => {
              testData.loanTypeName = loanTypes[0].name;
            },
          );
          cy.getMaterialTypes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then(
            (res) => {
              testData.materialTypeName = res.name;
            },
          );
          // Step 1-3: Create MARC bib instance via API (covers manual steps 1-3 of creating the instance)
          return cy
            .createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
              {
                tag: '245',
                content: `$a AT_C359013_MarcBibInstance_${randomPostfix}`,
                indicators: ['1', '1'],
              },
            ])
            .then((instanceId) => {
              testData.instanceId = instanceId;
            });
        })
        .then(() => {
          // Step 7: Write CSV with instance UUID for export
          return FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
        })
        .then(() => {
          // Step 8: Export instance as MARC via API and download to fixtures
          return ExportFile.exportFileViaApi(csvFileName).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          // Step 10: Create Holdings field mapping profile with permanent location and statistical code
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: mappingProfiles.holdings.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.HOLDINGS.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.HOLDINGS,
                mappingFields: [
                  {
                    name: 'permanentLocationId',
                    enabled: true,
                    path: 'holdings.permanentLocationId',
                    value: `"${testData.locationName}"`,
                    subfields: [],
                  },
                  {
                    name: 'statisticalCodeIds',
                    enabled: true,
                    path: 'holdings.statisticalCodeIds[]',
                    value: '',
                    repeatableFieldAction: 'EXTEND_EXISTING',
                    subfields: [
                      {
                        order: 0,
                        path: 'holdings.statisticalCodeIds[]',
                        fields: [
                          {
                            name: 'statisticalCodeId',
                            enabled: true,
                            path: 'holdings.statisticalCodeIds[]',
                            value: `"${testData.statCode.displayName}"`,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          }).then(({ body }) => {
            // Step 12: Create Holdings action profile linked to Holdings mapping profile
            return NewActionProfile.createActionProfileViaApi(
              actionProfiles.holdings,
              body.id,
            ).then((apResponse) => {
              testData.holdingsApId = apResponse.body.id;
            });
          });
        })
        .then(() => {
          // Step 11: Create Item field mapping profile with material type, loan type, status and statistical code
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: mappingProfiles.item.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.ITEM,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.ITEM.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.ITEM,
                mappingFields: [
                  {
                    name: 'materialType.id',
                    enabled: true,
                    path: 'item.materialType.id',
                    value: `"${testData.materialTypeName}"`,
                    subfields: [],
                  },
                  {
                    name: 'permanentLoanType.id',
                    enabled: true,
                    path: 'item.permanentLoanType.id',
                    value: `"${testData.loanTypeName}"`,
                    subfields: [],
                  },
                  {
                    name: 'status.name',
                    enabled: true,
                    path: 'item.status.name',
                    value: `"${ITEM_STATUS_NAMES.AVAILABLE}"`,
                    subfields: [],
                  },
                  {
                    name: 'statisticalCodeIds',
                    enabled: true,
                    path: 'item.statisticalCodeIds[]',
                    value: '',
                    repeatableFieldAction: 'EXTEND_EXISTING',
                    subfields: [
                      {
                        order: 0,
                        path: 'item.statisticalCodeIds[]',
                        fields: [
                          {
                            name: 'statisticalCodeId',
                            enabled: true,
                            path: 'item.statisticalCodeIds[]',
                            value: `"${testData.statCode.displayName}"`,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          }).then(({ body }) => {
            // Step 13: Create Item action profile linked to Item mapping profile
            return NewActionProfile.createActionProfileViaApi(actionProfiles.item, body.id).then(
              (apResponse) => {
                testData.itemApId = apResponse.body.id;
              },
            );
          });
        })
        .then(() => {
          // Step 14: Create match profile matching 999 ff $i to Instance UUID
          return NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
            matchProfile,
          ).then((mpResponse) => {
            testData.matchProfileId = mpResponse.body.id;
          });
        })
        .then(() => {
          // Step 15: Create job profile with match profile + two action profiles under MATCH
          return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfileAndNonMatchActionProfileViaApi(
            jobProfile.profileName,
            testData.matchProfileId,
            [testData.holdingsApId, testData.itemApId],
          );
        })
        .then(() => {
          // Step 16-17: Import the exported MARC file using the job profile
          return DataImport.uploadFileViaApi(
            exportedMarcFileName,
            exportedMarcFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          return cy
            .createTempUser([Permissions.moduleDataImportEnabled.gui])
            .then((userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.dataImportPath,
                waiter: DataImport.waitLoading,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user?.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfiles.holdings.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfiles.item.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfiles.holdings.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfiles.item.name);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
    });

    it(
      'C359013 Marc bib: create Holdings and Item using exported record, by matching 999 ff field. (promin)',
      { tags: ['extendedPath', 'promin', 'C359013'] },
      () => {
        // Step 18: Open import log and verify Holdings and Item were Created
        Logs.openFileDetails(exportedMarcFileName);
        FileDetails.checkItemsStatusesInResultList(0, [
          FileDetails.status.dash,
          FileDetails.status.dash,
          FileDetails.status.created,
          FileDetails.status.created,
        ]);
      },
    );
  });
});
