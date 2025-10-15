import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../support/utils/cypressTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  InstancesRules,
  ActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createInstanceNoteRule } = InstancesRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C773241_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job using instances',
    entityType: 'INSTANCE',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndReplace('admin', 'Administrative')),
      createSuppressFromDiscoveryRule(false, true, true),
      createInstanceNoteRule(
        ActionCreators.findAndRemove('action'),
        null, // Will be set to Action note type ID
      ),
      createInstanceNoteRule(
        ActionCreators.findAndReplace('general', 'General'),
        null, // Will be set to General note type ID
      ),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'INSTANCE',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('admin'))],
  });
};

let user;
let bulkEditJobId;
let queryFileNames;
const testData = {
  profileIds: [],
  folioInstanceTitle: `AT_C773241_FolioInstance_${getRandomPostfix()}`,
  actionNote: 'action note for testing',
  generalNote: 'general note for testing',
  administrativeNote: 'admin note for testing',
  editedAdministrativeNote: 'Administrative note for testing',
  editedActionNote: ' note for testing',
  editedGeneralNote: 'General note for testing',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminUserDetails().then((record) => {
          testData.adminSourceRecord = record;
        });
        InstanceNoteTypes.getInstanceNoteTypesViaApi({ query: 'name=="Action note"' }).then(
          ({ instanceNoteTypes }) => {
            testData.actionNoteTypeId = instanceNoteTypes[0].id;
          },
        );
        InstanceNoteTypes.getInstanceNoteTypesViaApi({ query: 'name=="General note"' })
          .then(({ instanceNoteTypes }) => {
            testData.generalNoteTypeId = instanceNoteTypes[0].id;
          })
          .then(() => {
            // Create profiles using factory functions
            const mainProfile = createMainProfileBody();
            mainProfile.ruleDetails[2].actions[0].parameters[0].value = testData.actionNoteTypeId;
            mainProfile.ruleDetails[3].actions[0].parameters[0].value = testData.generalNoteTypeId;

            // Store profile description for test assertions
            testData.profileDescription = mainProfile.description;

            const secondProfile = createSecondProfileBody();
            testData.secondProfileDescription = secondProfile.description;

            // Create main bulk edit profile
            cy.createBulkEditProfile(mainProfile).then((profile) => {
              testData.profileName = profile.name;
              testData.profileIds.push(profile.id);
            });

            // Create second bulk edit profile to verify search and sorting
            cy.createBulkEditProfile(secondProfile).then((profile) => {
              testData.secondProfileName = profile.name;
              testData.profileIds.push(profile.id);
            });
          })
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              testData.instanceTypeId = instanceTypeData[0].id;
            });
            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
              testData.location = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
            cy.getBookMaterialType().then((materialTypeData) => {
              testData.materialTypeId = materialTypeData.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((loanTypeData) => {
              testData.loanTypeId = loanTypeData[0].id;
            });
          })
          .then(() => {
            // Create FOLIO Instance with holdings and items
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.folioInstanceTitle,
                administrativeNotes: [testData.administrativeNote],
                discoverySuppress: false,
                notes: [
                  {
                    instanceNoteTypeId: testData.actionNoteTypeId,
                    note: testData.actionNote,
                    staffOnly: false,
                  },
                  {
                    instanceNoteTypeId: testData.generalNoteTypeId,
                    note: testData.generalNote,
                    staffOnly: false,
                  },
                ],
              },
              holdings: [
                {
                  permanentLocationId: testData.location.id,
                  sourceId: testData.sourceId,
                  discoverySuppress: false,
                },
              ],
              items: [
                {
                  barcode: getRandomPostfix(),
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  discoverySuppress: false,
                },
              ],
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;
              testData.holdingsId = createdInstanceData.holdingIds[0].id;
              testData.itemBarcode = createdInstanceData.items[0].barcode;

              cy.getInstanceById(testData.instanceId).then((instanceData) => {
                testData.instanceHrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkInstanceRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(instanceFieldValues.suppressFromDiscovery);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.addNewRow();
            QueryModal.selectField(instanceFieldValues.instanceId, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.fillInValueTextfield(testData.instanceId, 1);
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
            QueryModal.clickTestQuery();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();
            cy.wait('@getPreview', getLongDelay()).then((interception) => {
              const interceptedUuid = interception.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              bulkEditJobId = interceptedUuid;
              queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);
            });
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
    });

    // Trillium
    it.skip(
      'C773241 Executing bulk edit job using FOLIO Instance bulk edit profile (Query, Logs) (firebird)',
      { tags: [] },
      () => {
        // Step 1: Click "Actions" menu
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);

        // Step 2: In the list of available column names uncheck checkboxes next to the options
        // that are going to be edited based on the bulk edit profile
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        );

        // Step 3: Click "Select instances bulk edit profile"
        BulkEditActions.clickSelectBulkEditProfile('FOLIO instances');
        SelectBulkEditProfileModal.waitLoading('FOLIO instances');
        SelectBulkEditProfileModal.verifyAllModalElements();

        // Step 4: Verify the table with the list of existing instances bulk edit profiles
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfilesSortedByName();
        SelectBulkEditProfileModal.changeSortOrderByName();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
        SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
        SelectBulkEditProfileModal.searchProfile('at_C773241');
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
        SelectBulkEditProfileModal.searchProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

        // Step 5: Verify the count of the profiles in the header is correct
        SelectBulkEditProfileModal.verifyProfilesFoundText();

        // Step 6: Click on the row with instances bulk edit profile from Preconditions
        SelectBulkEditProfileModal.selectProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyModalClosed('FOLIO instances');
        BulkEditActions.verifyAreYouSureForm(1);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: testData.editedAdministrativeNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            value: testData.editedGeneralNote,
          },
        ];

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          testData.editedActionNote,
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          testData.instanceHrid,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 7: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${testData.editedActionNote};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${testData.editedGeneralNote};false`,
        );

        // Step 8: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          testData.editedActionNote,
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          testData.instanceHrid,
          editedHeaderValues,
        );

        // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${testData.editedActionNote};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${testData.editedGeneralNote};false`,
        );

        // Remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);

        // Step 10: Click "Logs" toggle in "Set criteria" pane and Check "Inventory - instances" checkbox
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        // Step 11: Click on the "..." action element in the row with recently completed bulk edit job
        BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery();

        // Step 12: Click on the "File with identifiers of the records affected by bulk update"
        BulkEditLogs.downloadQueryIdentifiers();
        ExportFile.verifyFileIncludes(queryFileNames.identifiersQueryFilename, [
          testData.instanceId,
        ]);

        // Step 13: Click on the "File with the matching records" hyperlink
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          testData.administrativeNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${testData.actionNote};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${testData.generalNote};false`,
        );

        // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${testData.editedActionNote};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${testData.editedGeneralNote};false`,
        );

        // Step 15: Click on the "File with updated records (CSV)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.instanceHrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${testData.editedActionNote};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${testData.editedGeneralNote};false`,
        );

        // Step 16: Navigate to the "Inventory" app, search for the recently edited FOLIO Instances
        // Verify that made changes have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstanceTitle);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyAdministrativeNote(testData.editedAdministrativeNote.trim());
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
        InstanceRecordView.checkNotesByType(0, 'Action note', testData.editedActionNote);
        InstanceRecordView.checkNotesByType(1, 'General note', testData.editedGeneralNote);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();
      },
    );
  });
});
