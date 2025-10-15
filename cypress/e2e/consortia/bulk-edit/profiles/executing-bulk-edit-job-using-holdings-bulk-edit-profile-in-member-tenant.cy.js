import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../support/utils/fileManager';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  HoldingsRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

const {
  createHoldingsNoteRule,
  createElectronicAccessUriRule,
  createElectronicAccessUrlRelationshipRule,
} = HoldingsRules;

// Profile factory functions
const createMainProfileBody = (copyNoteTypeId, actionNoteTypeId, newUri, newUrlRelationship) => {
  return createBulkEditProfileBody({
    name: `AT_C773234_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test holdings bulk edit profile for executing bulk edit job in member tenant',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.changeType(copyNoteTypeId)),
      createSuppressFromDiscoveryRule(true, true),
      createElectronicAccessUriRule(ActionCreators.replaceWith(newUri)),
      createElectronicAccessUrlRelationshipRule(ActionCreators.replaceWith(newUrlRelationship)),
      createHoldingsNoteRule(ActionCreators.removeAll(), actionNoteTypeId),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('test'))],
  });
};

const testData = {
  folioInstance: {
    title: `AT_C773234_FolioInstance_${getRandomPostfix()}`,
    barcodeInMember: `Item_Member_${getRandomPostfix()}`,
    itemIds: [],
    holdingIds: [],
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
  actionNote: 'Action note for holdings',
  originalUri: 'https://original.uri.com',
  newUri: 'https://updated.uri.com',
  originalUrlRelationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
  newUrlRelationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
  electronicAccessTableHeadersInFile:
    'URL relationship;URI;Link text;Material specified;URL public note\n',
};

const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          cy.getHoldingNoteTypeIdViaAPI('Action note').then((actionNoteTypeId) => {
            testData.actionNoteTypeId = actionNoteTypeId;

            cy.getHoldingNoteTypeIdViaAPI('Copy note').then((copyNoteTypeId) => {
              testData.copyNoteTypeId = copyNoteTypeId;

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                testData.instanceTypeId = instanceTypeData[0].id;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                testData.materialTypeId = res.id;
              });
              InventoryInstances.getLocations({ limit: 1 }).then((res) => {
                testData.locationId = res[0].id;
                testData.locationName = res[0].name;
              });
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` })
                .then((res) => {
                  testData.loanTypeId = res[0].id;
                })
                .then(() => {
                  // Fetch electronic access relationship IDs via API
                  UrlRelationship.getViaApi({
                    query: `name=="${testData.originalUrlRelationship}"`,
                  }).then((relationships) => {
                    testData.originalUrlRelationshipId = relationships[0].id;
                  });
                  UrlRelationship.getViaApi({
                    query: `name=="${testData.newUrlRelationship}"`,
                  }).then((relationships) => {
                    testData.newUrlRelationshipId = relationships[0].id;
                  });
                })
                .then(() => {
                  // Create instance with holdings and items
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: testData.instanceTypeId,
                      title: testData.folioInstance.title,
                    },
                    holdings: [
                      {
                        permanentLocationId: testData.locationId,
                        administrativeNotes: [testData.administrativeNote],
                        discoverySuppress: true,
                        notes: [
                          {
                            holdingsNoteTypeId: testData.actionNoteTypeId,
                            note: testData.actionNote,
                            staffOnly: false,
                          },
                        ],
                        electronicAccess: [
                          {
                            uri: testData.originalUri,
                            relationshipId: testData.originalUrlRelationshipId,
                          },
                        ],
                      },
                    ],
                    items: [
                      {
                        barcode: testData.folioInstance.barcodeInMember,
                        materialType: { id: testData.materialTypeId },
                        permanentLoanType: { id: testData.loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        discoverySuppress: true,
                      },
                    ],
                  }).then((createdInstanceData) => {
                    testData.folioInstance.uuid = createdInstanceData.instanceId;
                    testData.folioInstance.holdingIds = createdInstanceData.holdingIds.map(
                      (holding) => holding.id,
                    );
                    testData.folioInstance.itemIds = createdInstanceData.items.map(
                      (item) => item.id,
                    );
                    testData.holdingUUID = createdInstanceData.holdingIds[0].id;

                    cy.getHoldings({
                      limit: 1,
                      query: `"instanceId"="${createdInstanceData.instanceId}"`,
                    }).then((holdings) => {
                      testData.holdingHRID = holdings[0].hrid;
                    });

                    FileManager.createFile(
                      `cypress/fixtures/${holdingUUIDsFileName}`,
                      testData.holdingUUID,
                    );
                  });

                  // Create profiles using factory functions
                  const mainProfile = createMainProfileBody(
                    testData.copyNoteTypeId,
                    testData.actionNoteTypeId,
                    testData.newUri,
                    testData.newUrlRelationshipId,
                  );
                  testData.profileDescription = mainProfile.description;

                  const secondProfile = createSecondProfileBody();
                  testData.secondProfileDescription = secondProfile.description;

                  cy.createBulkEditProfile(mainProfile).then((profile) => {
                    testData.profileName = profile.name;
                    testData.profileIds.push(profile.id);
                  });
                  cy.createBulkEditProfile(secondProfile).then((profile) => {
                    testData.secondProfileName = profile.name;
                    testData.profileIds.push(profile.id);
                  });
                });
            });
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.uuid);
        FileManager.deleteFile(`cypress/downloads/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C773234 ECS | Executing bulk edit job using Holdings bulk edit profile in Member tenant (Logs) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          );

          // Step 3: Click "Select holdings bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('holdings');
          SelectBulkEditProfileModal.waitLoading('holdings');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing holdings bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfileNumberMatchesNumberInSettings('holdings');
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C773234');
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

          // Step 6: Click on the row with holdings bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('holdings');
          BulkEditActions.verifyAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
              value: testData.administrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
              value: '',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.holdingHRID,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            testData.holdingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            testData.holdingHRID,
            testData.newUrlRelationship,
            testData.newUri,
            '-',
            '-',
            '-',
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );

          const electronicAccessInFile = `${testData.electronicAccessTableHeadersInFile}${testData.newUrlRelationship};${testData.newUri};-;-;-`;

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.holdingHRID,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            testData.holdingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            testData.holdingHRID,
            testData.newUrlRelationship,
            testData.newUri,
            '-',
            '-',
            '-',
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 10: Click "Logs" toggle in "Set criteria" pane
          // Check "Inventory - holdings" checkbox under "Record types" accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.clickActionsRunBy(testData.user.username);

          // Step 11: Click on the "..." action element in the row with recently completed bulk edit job
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          // Step 12: Click on the "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(holdingUUIDsFileName, [testData.holdingUUID]);

          // Step 13: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
          );

          // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // Step 15: Click on the "File with updated records (CSV)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            testData.holdingUUID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // Step 16: Navigate to the "Inventory" app, Search for the recently edited Holdings
          // Verify that made changes have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkAdministrativeNote('-');
          HoldingsRecordView.checkNotesByType(0, 'Copy note', testData.administrativeNote);
          HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
          HoldingsRecordView.checkElectronicAccess(testData.newUrlRelationship, testData.newUri);
          HoldingsRecordView.checkHoldingNoteTypeAbsent('Action note', testData.actionNote);
          HoldingsRecordView.close();
          InventoryInstance.openHoldings(['']);
          InventoryInstance.openItemByBarcode(testData.folioInstance.barcodeInMember);
          cy.wait(1000);
          ItemRecordView.suppressedAsDiscoveryIsAbsent();
        },
      );
    });
  });
});
