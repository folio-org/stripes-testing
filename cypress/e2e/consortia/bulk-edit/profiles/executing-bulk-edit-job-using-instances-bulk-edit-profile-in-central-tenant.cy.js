import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_SOURCE_NAMES,
} from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

const testData = {
  permissionsSet: [
    permissions.bulkEditEdit.gui,
    permissions.uiInventoryViewCreateEditInstances.gui,
    permissions.enableStaffSuppressFacet.gui,
    permissions.bulkEditQueryView.gui,
  ],
  folioInstance: {
    title: `AT_C773244_FolioInstance_${getRandomPostfix()}`,
  },
  marcInstance: {
    title: `AT_C773244_MarcInstance_${getRandomPostfix()}`,
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
  editedAdministrativeNote: ' note for testing',
  dissertationNote: 'Dissertation note for testing',
  errorMessage: ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED,
  profileBody: {
    name: `AT_C773244_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test instances bulk edit profile for executing bulk edit job in central tenant',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'FIND_AND_REMOVE_THESE',
            initial: 'admin',
          },
        ],
      },
      {
        option: 'STAFF_SUPPRESS',
        actions: [
          {
            type: 'SET_TO_TRUE',
          },
        ],
      },
      {
        option: 'STATISTICAL_CODE',
        actions: [
          {
            type: 'REMOVE_SOME',
            updated: null, // Will be set to statistical code id
          },
        ],
      },
      {
        option: 'INSTANCE_NOTE',
        actions: [
          {
            type: 'REMOVE_ALL',
            parameters: [
              {
                key: 'INSTANCE_NOTE_TYPE_ID_KEY',
                value: null, // Will be set to Dissertation note type id
              },
            ],
          },
        ],
      },
    ],
  },
  secondProfileBody: {
    name: `Test_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'FIND_AND_REMOVE_THESE',
            initial: 'test',
          },
        ],
      },
    ],
  },
  marcInstanceProfileBody: {
    name: `Test_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test MARC instances profile that should not appear in FOLIO instances list',
    locked: false,
    entityType: 'INSTANCE_MARC',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'FIND_AND_REMOVE_THESE',
            initial: 'marc',
          },
        ],
      },
    ],
  },
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(testData.permissionsSet).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, testData.permissionsSet);
          cy.resetTenant();
          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          // Get Dissertation note type id
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            query: 'name="Dissertation note"',
          })
            .then(({ instanceNoteTypes }) => {
              testData.profileBody.ruleDetails[3].actions[0].parameters[0].value =
                instanceNoteTypes[0].id;

              cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
                testData.statisticalCodeId = codes[0].id;
                testData.statisticalCodeName = codes[0].name;
                testData.profileBody.ruleDetails[2].actions[0].updated = codes[0].id;

                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypeData[0].id,
                      title: testData.folioInstance.title,
                      source: INSTANCE_SOURCE_NAMES.FOLIO,
                      administrativeNotes: [testData.administrativeNote],
                      notes: [
                        {
                          instanceNoteTypeId:
                            testData.profileBody.ruleDetails[3].actions[0].parameters[0].value,
                          note: testData.dissertationNote,
                          staffOnly: false,
                        },
                      ],
                      statisticalCodeIds: [testData.statisticalCodeId],
                      discoverySuppress: false,
                    },
                  }).then((instance) => {
                    testData.folioInstance.uuid = instance.instanceId;

                    cy.getInstanceById(testData.folioInstance.uuid).then((folioInstance) => {
                      testData.folioInstance.hrid = folioInstance.hrid;
                    });
                  });
                });
              });
            })
            .then(() => {
              const marcInstanceFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${testData.marcInstance.title}`,
                  indicators: ['1', '0'],
                },
                {
                  tag: '500',
                  content: `$a ${testData.dissertationNote}`,
                  indicators: ['\\', '\\'],
                },
              ];

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                testData.marcInstance.uuid = instanceId;

                cy.getInstanceById(instanceId).then((marcInstance) => {
                  testData.marcInstance.hrid = marcInstance.hrid;

                  const updatedInstance = {
                    ...marcInstance,
                    administrativeNotes: [testData.administrativeNote],
                    statisticalCodeIds: [testData.statisticalCodeId],
                    discoverySuppress: false,
                  };

                  cy.updateInstance(updatedInstance);
                });
              });
            })
            .then(() => {
              // Create all bulk edit profiles
              const profileConfigs = [
                { body: testData.profileBody, nameKey: 'profileName' },
                { body: testData.secondProfileBody, nameKey: 'secondProfileName' },
                { body: testData.marcInstanceProfileBody, nameKey: 'marcInstanceProfileName' },
              ];

              profileConfigs.forEach((config) => {
                cy.createBulkEditProfile(config.body).then((profile) => {
                  testData.profileIds.push(profile.id);
                  testData[config.nameKey] = profile.name;
                });
              });
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkInstanceRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(instanceFieldValues.instanceId);
              QueryModal.selectOperator(QUERY_OPERATIONS.IN);
              QueryModal.fillInValueTextfield(
                `${testData.folioInstance.uuid},${testData.marcInstance.uuid}`,
              );
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              QueryModal.clickTestQuery();
              QueryModal.verifyPreviewOfRecordsMatched();
              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();
              cy.wait('@getPreview', getLongDelay()).then((interception) => {
                const interceptedUuid = interception.request.url.match(
                  /bulk-operations\/([a-f0-9-]+)\/preview/,
                )[1];

                testData.queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
                  interceptedUuid,
                  true,
                );
              });
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        BulkEditFiles.deleteAllDownloadedFiles(testData.queryFileNames);
      });

      it(
        'C773244 ECS | Executing bulk edit job using FOLIO Instance bulk edit profile in Central tenant (Query) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C773244'] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          );

          // Step 3: Click "Select instances bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('FOLIO instances');
          SelectBulkEditProfileModal.waitLoading('FOLIO instances');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing instances bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileBody.description,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C773244');
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileBody.description,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.marcInstanceProfileName);
          SelectBulkEditProfileModal.searchProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileBody.description,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.marcInstanceProfileName);

          // Step 6: Click on the row with FOLIO Instance bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('FOLIO instances');
          BulkEditActions.verifyAreYouSureForm(2);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: testData.editedAdministrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: '',
            },
          ];
          const editedHeaderValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: testData.editedAdministrativeNote.trim(),
            },
          ];

          const instancesHrids = [testData.folioInstance.hrid, testData.marcInstance.hrid];

          instancesHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValues,
            );
          });
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          instancesHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              testData.queryFileNames.previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              editedHeaderValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            'Notes',
            '',
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            'Notes',
            `General note;${testData.dissertationNote};false`,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(2);

          // Verify only FOLIO instance changes are applied
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.folioInstance.hrid,
            editedHeaderValues,
          );

          // Verify error for MARC instance
          BulkEditSearchPane.verifyErrorByIdentifier(
            testData.marcInstance.uuid,
            testData.errorMessage,
          );
          BulkEditSearchPane.verifyErrorLabel(1);

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instancesHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              testData.queryFileNames.changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              editedHeaderValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            'Notes',
            '',
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            'Notes',
            `General note;${testData.dissertationNote};false`,
          );

          // Step 10: Click "Actions" menu and Click "Download errors (CSV)" option
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(testData.queryFileNames.errorsFromCommittingFileName, [
            `ERROR,${testData.marcInstance.uuid},${testData.errorMessage}`,
          ]);

          // Step 11: Navigate to "Inventory" app, verify FOLIO instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote(
            testData.editedAdministrativeNote.trim(),
          );
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(true);
          InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(testData.dissertationNote);

          // Step 12: Search for the recently edited MARC Instances
          InventorySearchAndFilter.byKeywords(testData.marcInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote(
            testData.editedAdministrativeNote.trim(),
          );
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(true);
          InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
          InstanceRecordView.verifyInstanceNote(testData.dissertationNote);
        },
      );
    });
  });
});
