import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

// Minimal POST helper - the shared ViaApi helpers each cover only part of what this test needs
// (e.g. no helper sets Item permanent location or Holdings temporary location), so profiles are
// built directly against the exact mappingFields the backend expects.
const createMappingProfileViaApi = (name, existingRecordType, mappingFields) =>
  cy
    .okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/mappingProfiles',
      body: {
        profile: {
          name,
          incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType,
          mappingDetails: {
            name: existingRecordType.toLowerCase(),
            recordType: existingRecordType,
            mappingFields,
          },
        },
        addedRelations: [],
        deletedRelations: [],
      },
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body);

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    const title = `AT_C350382_MarcBibInstance_${randomPostfix}`;
    const marcFileName = `AT_C350382_CreateFile_${randomPostfix}.mrc`;
    const editedMarcFileName = `AT_C350382_EditedFile_${randomPostfix}.mrc`;

    const instanceMappingProfileName = `AT_C350382 FMP Create simple instance ${randomPostfix}`;
    const holdingsMappingProfileForCreateName = `AT_C350382 FMP Create simple holdings ${randomPostfix}`;
    const itemMappingProfileForCreateName = `AT_C350382 FMP Create simple item ${randomPostfix}`;
    const holdingsMappingProfileForUpdateName = `AT_C350382 FMP Update simple holdings ${randomPostfix}`;
    const itemMappingProfileForUpdateName = `AT_C350382 FMP Update simple item ${randomPostfix}`;

    const instanceActionProfile = {
      name: `AT_C350382 AP Create Instance ${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const holdingsActionProfileForCreate = {
      name: `AT_C350382 AP Create Holdings ${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
    };
    const itemActionProfileForCreate = {
      name: `AT_C350382 AP Create Item ${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.ITEM,
    };
    const holdingsActionProfileForUpdate = {
      name: `AT_C350382 AP Update Holdings ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
    };
    const itemActionProfileForUpdate = {
      name: `AT_C350382 AP Update Item ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.ITEM,
    };

    const instanceMatchProfileName = `AT_C350382 MP Instance match by HRID ${randomPostfix}`;
    const holdingsMatchProfileName = `AT_C350382 MP Holdings submatch by permanent location ${randomPostfix}`;
    const itemMatchProfileName = `AT_C350382 MP Item submatch by permanent location ${randomPostfix}`;

    const jobProfileForCreateName = `AT_C350382 JP Create Simple Instance, Holdings, Item ${randomPostfix}`;
    const jobProfileForUpdateName = `AT_C350382 JP Update Simple Holdings, Item ${randomPostfix}`;

    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteFullInstancesByTitleViaApi('C350382_');

        // Two distinct, non-test active locations: one for the Permanent location used by the
        // Create profiles (and the static-value submatches), one for the Temporary location set
        // by the Update holdings profile. getLocations resolves to locations[0] but also caches
        // every location it fetched (up to `limit`) on Cypress.env('locations').
        cy.getLocations({
          limit: 2,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((permanentLocation) => {
          testData.temporaryLocation = Cypress.env('locations')[1];
          testData.permanentLocationName = `${permanentLocation.name} (${permanentLocation.code})`;

          // Field mapping profiles -> Action profiles (Create Instance, Holdings, Item)
          createMappingProfileViaApi(instanceMappingProfileName, EXISTING_RECORD_NAMES.INSTANCE, [
            {
              name: 'catalogedDate',
              enabled: true,
              path: 'instance.catalogedDate',
              value: '###TODAY###',
              subfields: [],
            },
            {
              name: 'statusId',
              enabled: true,
              path: 'instance.statusId',
              value: `"${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED}"`,
              subfields: [],
              acceptedValues: {},
            },
          ])
            .then((body) =>
              NewActionProfile.createActionProfileViaApi(instanceActionProfile, body.id),
            )
            .then((response) => {
              testData.instanceActionProfileId = response.body.id;
            });

          createMappingProfileViaApi(
            holdingsMappingProfileForCreateName,
            EXISTING_RECORD_NAMES.HOLDINGS,
            [
              {
                name: 'permanentLocationId',
                enabled: true,
                path: 'holdings.permanentLocationId',
                value: `"${testData.permanentLocationName}"`,
                subfields: [],
                acceptedValues: {},
              },
            ],
          )
            .then((body) =>
              NewActionProfile.createActionProfileViaApi(holdingsActionProfileForCreate, body.id),
            )
            .then((response) => {
              testData.holdingsActionProfileForCreateId = response.body.id;
            });

          createMappingProfileViaApi(itemMappingProfileForCreateName, EXISTING_RECORD_NAMES.ITEM, [
            {
              name: 'materialType.id',
              enabled: true,
              path: 'item.materialType.id',
              value: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
              subfields: [],
              acceptedValues: {},
            },
            {
              name: 'permanentLoanType.id',
              enabled: true,
              path: 'item.permanentLoanType.id',
              value: `"${LOAN_TYPE_NAMES.CAN_CIRCULATE}"`,
              subfields: [],
              acceptedValues: {},
            },
            {
              name: 'status.name',
              enabled: true,
              path: 'item.status.name',
              value: `"${ITEM_STATUS_NAMES.AVAILABLE}"`,
              subfields: [],
            },
            {
              name: 'permanentLocation.id',
              enabled: true,
              path: 'item.permanentLocation.id',
              value: `"${testData.permanentLocationName}"`,
              subfields: [],
              acceptedValues: {},
            },
          ])
            .then((body) =>
              NewActionProfile.createActionProfileViaApi(itemActionProfileForCreate, body.id),
            )
            .then((response) => {
              testData.itemActionProfileForCreateId = response.body.id;
            });

          // Field mapping profiles -> Action profiles (Update Holdings, Item)
          createMappingProfileViaApi(
            holdingsMappingProfileForUpdateName,
            EXISTING_RECORD_NAMES.HOLDINGS,
            [
              {
                name: 'temporaryLocationId',
                enabled: true,
                path: 'holdings.temporaryLocationId',
                value: `"${testData.temporaryLocation.name} (${testData.temporaryLocation.code})"`,
                subfields: [],
                acceptedValues: {},
              },
            ],
          )
            .then((body) =>
              NewActionProfile.createActionProfileViaApi(holdingsActionProfileForUpdate, body.id),
            )
            .then((response) => {
              testData.holdingsActionProfileForUpdateId = response.body.id;
            });

          createMappingProfileViaApi(itemMappingProfileForUpdateName, EXISTING_RECORD_NAMES.ITEM, [
            {
              name: 'permanentLoanType.id',
              enabled: true,
              path: 'item.permanentLoanType.id',
              value: `"${LOAN_TYPE_NAMES.COURSE_RESERVES}"`,
              subfields: [],
              acceptedValues: {},
            },
          ])
            .then((body) =>
              NewActionProfile.createActionProfileViaApi(itemActionProfileForUpdate, body.id),
            )
            .then((response) => {
              testData.itemActionProfileForUpdateId = response.body.id;
            });

          // Match profiles: Instance by HRID (001), Holdings/Item submatches by static-value
          // permanent location
          NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi({
            profileName: instanceMatchProfileName,
            incomingRecordFields: { field: '001' },
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
            existingMatchExpressionValue: 'instance.hrid',
            recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          }).then(({ body }) => {
            testData.instanceMatchProfileId = body.id;
          });

          NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi({
            profileName: holdingsMatchProfileName,
            incomingStaticValue: testData.permanentLocationName,
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
            existingRecordOption: 'holdingsrecord.permanentLocationId',
          }).then(({ body }) => {
            testData.holdingsMatchProfileId = body.id;
          });

          NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi({
            profileName: itemMatchProfileName,
            incomingStaticValue: testData.permanentLocationName,
            existingRecordType: EXISTING_RECORD_NAMES.ITEM,
            existingRecordOption: 'item.permanentLocationId',
          }).then(({ body }) => {
            testData.itemMatchProfileId = body.id;
          });

          // Job profile 1: 3 linked Create actions, no match
          cy.then(() => {
            NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
              { name: jobProfileForCreateName },
              testData.instanceActionProfileId,
              testData.holdingsActionProfileForCreateId,
              testData.itemActionProfileForCreateId,
            ).then((id) => {
              testData.jobProfileForCreateId = id;
            });
          });

          // Job profile 2: Instance match is an anchor only (no action of its own - the Instance
          // is never updated), with two sibling submatches (Holdings, Item) each leading to its
          // own Update action.
          cy.then(() =>
            cy
              .okapiRequest({
                method: 'POST',
                path: 'data-import-profiles/jobProfiles',
                body: {
                  profile: { name: jobProfileForUpdateName, dataType: 'MARC' },
                  addedRelations: [
                    {
                      masterProfileId: null,
                      masterWrapperId: null,
                      masterProfileType: 'JOB_PROFILE',
                      detailProfileId: testData.instanceMatchProfileId,
                      detailWrapperId: null,
                      detailProfileType: 'MATCH_PROFILE',
                      order: 0,
                    },
                    {
                      masterProfileId: testData.instanceMatchProfileId,
                      masterWrapperId: null,
                      masterProfileType: 'MATCH_PROFILE',
                      detailProfileId: testData.holdingsMatchProfileId,
                      detailWrapperId: null,
                      detailProfileType: 'MATCH_PROFILE',
                      order: 0,
                      reactTo: 'MATCH',
                    },
                    {
                      masterProfileId: testData.holdingsMatchProfileId,
                      masterWrapperId: null,
                      masterProfileType: 'MATCH_PROFILE',
                      detailProfileId: testData.holdingsActionProfileForUpdateId,
                      detailWrapperId: null,
                      detailProfileType: 'ACTION_PROFILE',
                      order: 0,
                      reactTo: 'MATCH',
                    },
                    {
                      masterProfileId: testData.instanceMatchProfileId,
                      masterWrapperId: null,
                      masterProfileType: 'MATCH_PROFILE',
                      detailProfileId: testData.itemMatchProfileId,
                      detailWrapperId: null,
                      detailProfileType: 'MATCH_PROFILE',
                      order: 1,
                      reactTo: 'MATCH',
                    },
                    {
                      masterProfileId: testData.itemMatchProfileId,
                      masterWrapperId: null,
                      masterProfileType: 'MATCH_PROFILE',
                      detailProfileId: testData.itemActionProfileForUpdateId,
                      detailWrapperId: null,
                      detailProfileType: 'ACTION_PROFILE',
                      order: 0,
                      reactTo: 'MATCH',
                    },
                  ],
                  deletedRelations: [],
                },
                isDefaultSearchParamsRequired: false,
              })
              .then(({ body }) => {
                testData.jobProfileForUpdateId = body.id;
              }),
          );

          // Build the incoming MARC bib file, import it (Job profile 1) to create the
          // Instance/Holdings/Item, then edit 001/003 for the second import (Step 16)
          cy.then(() => {
            DataImport.createMarcFile({
              fileName: marcFileName,
              recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              fields: [{ tag: '245', indicators: ['0', '0'], content: `$a ${title}` }],
            });
          });

          cy.then(() => {
            DataImport.uploadFileViaApi(marcFileName, marcFileName, jobProfileForCreateName).then(
              (response) => {
                // The import response's instance.id is always a real UUID, but its hrid is not
                // always populated - fetch the instance by id to get a reliable hrid.
                cy.getInstanceById(response[0].instance.id).then((instance) => {
                  DataImport.editMarcFieldsInAllRecords(marcFileName, editedMarcFileName, {
                    removeTags: ['001', '003'],
                    addFields: [{ tag: '001', content: instance.hrid }],
                  });
                });
              },
            );
          });
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileViaApi(testData.jobProfileForCreateId);
        SettingsJobProfiles.deleteJobProfileViaApi(testData.jobProfileForUpdateId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(instanceMatchProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsMatchProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(itemMatchProfileName);
        [
          instanceActionProfile,
          holdingsActionProfileForCreate,
          itemActionProfileForCreate,
          holdingsActionProfileForUpdate,
          itemActionProfileForUpdate,
        ].forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name);
        });
        [
          instanceMappingProfileName,
          holdingsMappingProfileForCreateName,
          itemMappingProfileForCreateName,
          holdingsMappingProfileForUpdateName,
          itemMappingProfileForUpdateName,
        ].forEach((name) => {
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(name);
        });
        InventoryInstances.deleteFullInstancesByTitleViaApi(title);
      });
    });

    it(
      'C350382 Display log hotlinks for Inventory Holdings and Items when the Instance is not Updated (promin)',
      { tags: ['extendedPath', 'promin', 'C350382'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        // Step 17: upload the edited MARC file
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();

        // Step 18: select the "Update Simple Holdings, Item" job profile and run the import
        JobProfiles.search(jobProfileForUpdateName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 19: Holdings and Item columns show "Updated" hotlinks with the new values;
        // Instance is matched but not updated
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.DASH,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkTemporaryLocation(testData.temporaryLocation.name);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
        ItemRecordView.verifyPermanentLoanType(LOAN_TYPE_NAMES.COURSE_RESERVES);
      },
    );
  });
});
