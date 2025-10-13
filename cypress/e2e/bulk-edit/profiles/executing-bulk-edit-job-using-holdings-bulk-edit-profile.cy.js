import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../support/utils/cypressTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  HoldingsRules,
  ActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const {
  createElectronicAccessLinkTextRule,
  createMarkAsStaffOnlyRule,
  createRemoveMarkAsStaffOnlyRule,
} = HoldingsRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C773231_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndRemove('admin')),
      createSuppressFromDiscoveryRule(false, true),
      createElectronicAccessLinkTextRule(ActionCreators.findAndRemove('link')),
      createMarkAsStaffOnlyRule(null), // Will be set to Action note type ID
      createRemoveMarkAsStaffOnlyRule(null), // Will be set to Binding note type ID
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('admin'))],
  });
};

let user;
let bulkEditJobId;
let queryFileNames;
const testData = {
  profileIds: [],
  folioInstanceTitle: `AT_C773231_FolioInstance_${getRandomPostfix()}`,
  marcInstanceTitle: `AT_C773231_MarcInstance_${getRandomPostfix()}`,
  actionNote: 'Action note not marked as staff only',
  bindingNote: 'Binding note marked as staff only',
  linkText: 'link text for electronic access',
  editedLinkText: ' text for electronic access',
  uri: 'https://example.com',
  administrativeNote: 'admin note for testing',
  editedAdministrativeNote: ' note for testing',
  electronicAccessTableHeadersInFile:
    'URL relationship;URI;Link text;Material specified;URL public note\n',
  errorMessage: 'Holdings records that have source "MARC" cannot be changed',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminUserDetails().then((record) => {
          testData.adminSourceRecord = record;
        });
        cy.getHoldingNoteTypeIdViaAPI('Action note').then((actionNoteTypeId) => {
          testData.actionNoteTypeId = actionNoteTypeId;
        });
        cy.getHoldingNoteTypeIdViaAPI('Binding')
          .then((bindingNoteTypeId) => {
            testData.bindingNoteTypeId = bindingNoteTypeId;
          })
          .then(() => {
            // Create profiles using factory functions
            const mainProfile = createMainProfileBody();
            mainProfile.ruleDetails[3].actions[0].parameters[0].value = testData.actionNoteTypeId;
            mainProfile.ruleDetails[4].actions[0].parameters[0].value = testData.bindingNoteTypeId;

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
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.folioInstanceTitle,
              },
            }).then((createdInstanceData) => {
              testData.folioInstanceId = createdInstanceData.instanceId;

              cy.getInstanceById(testData.folioInstanceId).then((instanceData) => {
                testData.instanceHrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstanceId,
              permanentLocationId: testData.location.id,
              sourceId: testData.sourceId,
              administrativeNotes: [testData.administrativeNote],
              discoverySuppress: false,
              electronicAccess: [
                {
                  linkText: testData.linkText,
                  uri: testData.uri,
                },
              ],
              notes: [
                {
                  holdingsNoteTypeId: testData.actionNoteTypeId,
                  note: testData.actionNote,
                  staffOnly: false,
                },
                {
                  holdingsNoteTypeId: testData.bindingNoteTypeId,
                  note: testData.bindingNote,
                  staffOnly: true,
                },
              ],
            }).then((folioHolding) => {
              testData.folioHoldingsId = folioHolding.id;
              testData.folioHoldingsHrid = folioHolding.hrid;
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(testData.marcInstanceTitle)
              .then((instanceId) => {
                testData.marcInstanceId = instanceId;

                cy.getInstanceById(instanceId).then((instanceData) => {
                  testData.marcInstanceHrid = instanceData.hrid;
                });
              })
              .then(() => {
                cy.createSimpleMarcHoldingsViaAPI(
                  testData.marcInstanceId,
                  testData.marcInstanceHrid,
                  testData.location.code,
                ).then((marcHoldingId) => {
                  testData.marcHoldingId = marcHoldingId;

                  // Get MARC holding data and update with all required fields
                  cy.getHoldings({
                    limit: 1,
                    query: `"instanceId"="${testData.marcInstanceId}"`,
                  }).then((holdingData) => {
                    testData.marcHoldingHrid = holdingData[0].hrid;

                    const updatedMarcHolding = {
                      ...holdingData[0],
                      administrativeNotes: [testData.administrativeNote],
                      discoverySuppress: false,
                      electronicAccess: [
                        {
                          linkText: testData.linkText,
                          uri: testData.uri,
                        },
                      ],
                      notes: [
                        {
                          holdingsNoteTypeId: testData.actionNoteTypeId,
                          note: testData.actionNote,
                          staffOnly: false,
                        },
                        {
                          holdingsNoteTypeId: testData.bindingNoteTypeId,
                          note: testData.bindingNote,
                          staffOnly: true,
                        },
                      ],
                    };

                    // Update MARC holding with all required fields
                    cy.updateHoldingRecord(testData.marcHoldingId, updatedMarcHolding).then(() => {
                      // Create items for both FOLIO and MARC holdings
                      const holdingsData = [
                        {
                          id: testData.folioHoldingsId,
                          itemBarcode: 'folioHoldingItemBarcode',
                        },
                        {
                          id: testData.marcHoldingId,
                          itemBarcode: 'marcHoldingItemBarcode',
                        },
                      ];

                      holdingsData.forEach((holding) => {
                        InventoryItems.createItemViaApi({
                          barcode: getRandomPostfix(),
                          holdingsRecordId: holding.id,
                          materialType: { id: testData.materialTypeId },
                          permanentLoanType: { id: testData.loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          discoverySuppress: false,
                        }).then((item) => {
                          testData[holding.itemBarcode] = item.barcode;
                        });
                      });
                    });
                  });
                });
              });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkHoldingsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(holdingsFieldValues.notesNoteType);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.chooseFromValueMultiselect('Action note');
            QueryModal.chooseFromValueMultiselect('Binding');
            QueryModal.addNewRow();
            QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
            QueryModal.fillInValueTextfield(
              `${testData.folioInstanceId},${testData.marcInstanceId}`,
              1,
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
      [testData.folioInstanceId, testData.marcInstanceId].forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });

      BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
    });

    // Trillium
    it.skip(
      'C773231 Executing bulk edit job using Holdings bulk edit profile (Query, Logs) (firebird)',
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
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
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
        SelectBulkEditProfileModal.verifyProfilesSortedByName();
        SelectBulkEditProfileModal.changeSortOrderByName();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
        SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
        SelectBulkEditProfileModal.searchProfile('at_C773231');
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
        BulkEditActions.verifyAreYouSureForm(2);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
            value: `${testData.actionNote} (staff only)`,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
            value: testData.bindingNote,
          },
        ];

        const holdingHrids = [testData.folioHoldingsHrid, testData.marcHoldingHrid];

        holdingHrids.forEach((holdingHrid) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            holdingHrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            testData.editedAdministrativeNote,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            holdingHrid,
            '-',
            testData.uri,
            testData.editedLinkText,
            '-',
            '-',
          );
        });
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

        // Step 7: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();

        const electronicAccessInFile = `${testData.electronicAccessTableHeadersInFile}-;${testData.uri};${testData.editedLinkText};-;-`;

        holdingHrids.forEach((holdingHrid) => {
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            true,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            testData.editedAdministrativeNote.trim(),
          );
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );
        });

        // Step 8: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          testData.folioHoldingsHrid,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          'true',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote,
        );
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          testData.folioHoldingsHrid,
          '-',
          testData.uri,
          testData.editedLinkText,
          '-',
          '-',
        );
        BulkEditSearchPane.verifyError(testData.marcHoldingId, testData.errorMessage);
        BulkEditSearchPane.verifyErrorLabel(5);

        // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          editedHeaderValues,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote.trim(),
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          electronicAccessInFile,
        );

        // Step 10: Click "Actions" menu and Click "Download errors (CSV)" option
        const expectedErrorMessagesInFile = Array(5)
          .fill(`ERROR,${testData.marcHoldingId},${testData.errorMessage}`)
          .join('\n');

        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(queryFileNames.errorsFromCommittingFileName, [
          expectedErrorMessagesInFile,
        ]);

        // Remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);

        // Step 11: Click "Logs" toggle in "Set criteria" pane and Check "Inventory - holdings" checkbox
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        // Step 12: Click on the "..." action element in the row with recently completed bulk edit job
        BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

        // Step 13: Click on the "File with identifiers of the records affected by bulk update"
        BulkEditLogs.downloadQueryIdentifiers();
        ExportFile.verifyFileIncludes(queryFileNames.identifiersQueryFilename, [
          testData.folioHoldingsId,
          testData.marcHoldingId,
        ]);

        // Step 14: Click on the "File with the matching records" hyperlink
        BulkEditLogs.downloadFileWithMatchingRecords();

        holdingHrids.forEach((holdingHrid) => {
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.matchedRecordsQueryFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
        });

        // Step 15: Click on the "File with the preview of proposed changes (CSV)" hyperlink
        BulkEditLogs.downloadFileWithProposedChanges();

        holdingHrids.forEach((holdingHrid) => {
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            true,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            testData.editedAdministrativeNote.trim(),
          );
          BulkEditFiles.verifyValueInRowByUUID(
            queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );
        });

        // Step 16: Click on the "File with updated records (CSV)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecords();

        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          editedHeaderValues,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          true,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          testData.editedAdministrativeNote.trim(),
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          testData.folioHoldingsHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          electronicAccessInFile,
        );

        // Step 17: Click on the "File with errors encountered when committing the changes" hyperlink
        BulkEditLogs.downloadFileWithCommitErrors();
        ExportFile.verifyFileIncludes(queryFileNames.errorsFromCommittingFileName, [
          expectedErrorMessagesInFile,
        ]);

        // Step 18: Navigate to the "Inventory" app, search for the recently edited FOLIO Holdings
        // Verify that made changes have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(testData.folioHoldingsHrid);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkAdministrativeNote(testData.editedAdministrativeNote.trim());
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.checkElectronicAccess(
          '-',
          testData.uri,
          testData.editedLinkText,
          '-',
          '-',
        );
        HoldingsRecordView.checkNotesByType(0, 'Action note', testData.actionNote, 'Yes');
        HoldingsRecordView.checkNotesByType(1, 'Binding', testData.bindingNote, 'No');
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcode(testData.folioHoldingItemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();

        // Step 19: Search for the recently edited MARC Holdings, verify that made changes have NOT been applied
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(testData.marcHoldingHrid);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkAdministrativeNote(testData.administrativeNote);
        HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
        HoldingsRecordView.checkElectronicAccess('-', testData.uri, testData.linkText, '-', '-');
        HoldingsRecordView.checkNotesByType(0, 'Action note', testData.actionNote, 'No');
        HoldingsRecordView.checkNotesByType(1, 'Binding', testData.bindingNote, 'Yes');
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcode(testData.marcHoldingItemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();
      },
    );
  });
});
