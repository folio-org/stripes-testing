import {
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  EXISTING_RECORD_NAMES,
  INCOMING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC1395027.mrc',
        fileName: `testMarcFileC1395027.${randomPostfix}.mrc`,
      },
      instanceTitle: 'AT_C1395027_MarcBibInstance',
      errorMessage: 'Provided Statistical code(s) are not a valid values:',
    };

    const mappingProfiles = {
      instance: { name: `AT_C1395027 FMP Instance ${randomPostfix}` },
      holdings: { name: `AT_C1395027 FMP Holdings ${randomPostfix}` },
      item: { name: `AT_C1395027 FMP Item ${randomPostfix}` },
    };

    const actionProfiles = {
      instance: {
        name: `AT_C1395027 AP Instance ${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      holdings: {
        name: `AT_C1395027 AP Holdings ${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'HOLDINGS',
      },
      item: {
        name: `AT_C1395027 AP Item ${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'ITEM',
      },
    };

    const jobProfile = { name: `AT_C1395027 JP ${randomPostfix}` };

    let instanceApId;
    let holdingsApId;
    let itemApId;
    let locationName;
    let materialTypeName;
    let loanTypeName;
    let user;

    before('Create profiles and user', () => {
      cy.getAdminToken();

      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
      }).then((res) => {
        locationName = res.name;
      });
      cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then((loanTypes) => {
        loanTypeName = loanTypes[0].name;
      });
      cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
        materialTypeName = res.name;
      });

      // All profile bodies are built inside cy.then() so dynamic variables are resolved at run time
      cy.then(() => {
        // Step 2: Create Instance mapping profile - no statistical codes
        FieldMappingProfiles.createMappingProfileViaApi({
          profile: {
            name: mappingProfiles.instance.name,
            incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          },
          addedRelations: [],
          deletedRelations: [],
        }).then(({ body }) => {
          NewActionProfile.createActionProfileViaApi(actionProfiles.instance, body.id).then(
            (apResponse) => {
              instanceApId = apResponse.body.id;
            },
          );
        });

        // Step 3: Create Holdings mapping profile with invalid statistical code
        FieldMappingProfiles.createMappingProfileViaApi({
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
                  value: `"${locationName}"`,
                  subfields: [],
                },
                {
                  name: 'statisticalCodeIds',
                  enabled: true,
                  path: 'holdings.statisticalCodeIds[]',
                  value: '',
                  subfields: [
                    {
                      order: 0,
                      path: 'holdings.statisticalCodeIds[]',
                      fields: [
                        {
                          name: 'statisticalCodeId',
                          enabled: true,
                          path: 'holdings.statisticalCodeIds[]',
                          value: '991$a',
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
          NewActionProfile.createActionProfileViaApi(actionProfiles.holdings, body.id).then(
            (apResponse) => {
              holdingsApId = apResponse.body.id;
            },
          );
        });

        // Step 4: Create Item mapping profile with invalid statistical code
        FieldMappingProfiles.createMappingProfileViaApi({
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
                  value: `"${materialTypeName}"`,
                  subfields: [],
                },
                {
                  name: 'permanentLoanType.id',
                  enabled: true,
                  path: 'item.permanentLoanType.id',
                  value: `"${loanTypeName}"`,
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
                  subfields: [
                    {
                      order: 0,
                      path: 'item.statisticalCodeIds[]',
                      fields: [
                        {
                          name: 'statisticalCodeId',
                          enabled: true,
                          path: 'item.statisticalCodeIds[]',
                          value: '992$a',
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
        })
          .then(({ body }) => {
            NewActionProfile.createActionProfileViaApi(actionProfiles.item, body.id).then(
              (apResponse) => {
                itemApId = apResponse.body.id;
              },
            );
          })
          // Steps 5-10: Create action profiles and job profile
          .then(() => {
            NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
              jobProfile,
              instanceApId,
              holdingsApId,
              itemApId,
            );
          });
      });

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [
            CapabilitySets.uiDataImportSettingsManage,
            CapabilitySets.uiDataImport,
            CapabilitySets.uiInventory,
          ],
        );
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
      [
        actionProfiles.instance.name,
        actionProfiles.holdings.name,
        actionProfiles.item.name,
      ].forEach((name) => SettingsActionProfiles.deleteActionProfileByNameViaApi(name));
      [
        mappingProfiles.instance.name,
        mappingProfiles.holdings.name,
        mappingProfiles.item.name,
      ].forEach((name) => SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(name));
      InventoryInstances.deleteFullInstancesByTitleViaApi('C1395027_');
    });

    it(
      'C1395027 Check the import of invalid statistical code for holding (promin)',
      { tags: ['extendedPath', 'promin', 'C1395027'] },
      () => {
        // Steps 1-10: All profiles created via API in before() hook

        // Steps 11-12: Upload file and run import
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFile.fileName);
        Logs.checkJobStatus(testData.marcFile.fileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);

        // Step 13: Open file details and verify CREATED for Instance, NO_ACTION for Holdings
        Logs.openFileDetails(testData.marcFile.fileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.holdings,
        );

        // Step 14: Open JSON screen and verify error message in Holdings tab
        FileDetails.openJsonScreen(testData.instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openHoldingsTab();
        JsonScreenView.verifyContentInTab(testData.errorMessage);
      },
    );
  });
});
