import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  BULK_EDIT_ACTIONS,
} from '../../../support/constants';

let user;
let sourceId;
let electronicAccessResourceRelationshipId;
let instanceHRIDFileName;
let fileNames;
let instance;
const totalHoldings = 11;
const textWithSpecialCharacters = 'Te;st: [sample] li*nk$text';
const materialsWithLineBreak = 'Test\nMaterials specified';
const publicNoteWith31999Symbols = 'A'.repeat(31999);
const administrativeNote = 'Some electronic access properties have been removed';
const testUri = 'https://www.testuri.com/uri';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';

describe('Bulk-edit', () => {
  describe(
    'In-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceHRIDFileName, true);
        instance = {
          instanceName: `AT_C423501_FolioInstance_${getRandomPostfix()}`,
          instanceId: '',
          instanceHRID: '',
          holdingHRIDs: [],
          holdingIds: [],
          targetHoldingHRID: '',
          targetHoldingId: '',
        };

        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryCRUDHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          UrlRelationship.getViaApi().then((relationships) => {
            electronicAccessResourceRelationshipId = relationships.find(
              (rel) => rel.name === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            ).id;
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instance.instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                instance.holdingTypeId = holdingTypes[0].id;
              });
            })
            .then(() => {
              cy.getLocations({ limit: 1 }).then((locations) => {
                instance.locationId = locations.id;
              });
            })
            .then(() => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                sourceId = folioSource.id;
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instance.instanceTypeId,
                  title: instance.instanceName,
                },
                holdings: [
                  {
                    holdingsTypeId: instance.holdingTypeId,
                    permanentLocationId: instance.locationId,
                  },
                ],
              }).then((createdInstance) => {
                instance.instanceId = createdInstance.instanceId;

                cy.getInstanceById(createdInstance.instanceId).then((instanceData) => {
                  instance.instanceHRID = instanceData.hrid;

                  FileManager.createFile(
                    `cypress/fixtures/${instanceHRIDFileName}`,
                    instanceData.hrid,
                  );

                  // Get the holding by ID before updating
                  const holdingId = createdInstance.holdingIds[0].id;
                  cy.getHoldings({ limit: 1, query: `"id"=="${holdingId}"` }).then((holdings) => {
                    const holdingData = holdings[0];

                    cy.updateHoldingRecord(holdingId, {
                      ...holdingData,
                      electronicAccess: [
                        {
                          relationshipId: electronicAccessResourceRelationshipId,
                          uri: testUri,
                          linkText: textWithSpecialCharacters,
                          materialsSpecification: materialsWithLineBreak,
                          publicNote: publicNoteWith31999Symbols,
                        },
                      ],
                    }).then(() => {
                      instance.targetHoldingHRID = holdingData.hrid;
                      instance.targetHoldingId = holdingId;
                      instance.holdingHRIDs.push(holdingData.hrid);
                      instance.holdingIds.push(holdingId);

                      /* eslint-disable no-loop-func */
                      for (let i = 0; i < totalHoldings - 1; i++) {
                        InventoryHoldings.createHoldingRecordViaApi({
                          instanceId: createdInstance.instanceId,
                          permanentLocationId: instance.locationId,
                          sourceId,
                        }).then((holding) => {
                          instance.holdingHRIDs.push(holding.hrid);
                          instance.holdingIds.push(holding.id);
                        });
                      }
                    });
                  });
                });
              });

              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${fileNames.matchedRecordsCSV}`);
        FileManager.deleteFile(`cypress/fixtures/${fileNames.previewRecordsCSV}`);
        FileManager.deleteFile(`cypress/fixtures/${fileNames.changedRecordsCSV}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423501 Verify rendering Holdings electronic access properties while bulk edit more than 10 Holdings (firebird)',
        { tags: ['criticalPath', 'firebird', 'C423501'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button and "Instance HRIDs" identifier
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');

          // Step 2: Upload .csv file with valid Instance HRID
          BulkEditSearchPane.uploadFile(instanceHRIDFileName);
          BulkEditSearchPane.checkForUploading(instanceHRIDFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check the result of uploading the .csv file with Instance HRID
          BulkEditSearchPane.verifyPaneRecordsCount('11 holdings');

          // Step 4: Show "Electronic access" and "Administrative note" columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          );

          // Step 5: Check the "Electronic access" main column for Holdings record with electronic access
          BulkEditSearchPane.verifyElectronicAccessColumnHeadersInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            instance.targetHoldingHRID,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            instance.targetHoldingHRID,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            testUri,
            textWithSpecialCharacters,
            materialsWithLineBreak,
            publicNoteWith31999Symbols,
          );

          // Step 6: Scroll down the "Preview of records matched"
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(totalHoldings);
          BulkEditSearchPane.verifyPreviewOfRecordMatchedScrollableVertically();

          // Step 7: Download matched records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const originalElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${testUri};${textWithSpecialCharacters};${materialsWithLineBreak};${publicNoteWith31999Symbols}`;

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            originalElectronicAccessInFile,
          );

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.matchedRecordsCSV).then((path) => {
            cy.wrap(path).as('matchedRecordsFixturePath');
          });

          // Step 8: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();

          // Step 9: Select "Link text" from "Electronic access" and "Clear field" action
          BulkEditActions.selectOption('Link text');
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CLEAR_FIELD);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10: Add new bulk edit filter string, select "Material specified" and "Clear field"
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('Material specified', 1);
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CLEAR_FIELD, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11: Add new bulk edit filter string, select "URL public note" and "Clear field"
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('URL public note', 2);
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CLEAR_FIELD, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Add new bulk edit filter string, select "Administrative note" and "Add note"
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('Administrative note', 3);
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE, 3);
          BulkEditActions.fillInFirstTextArea(administrativeNote, 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(totalHoldings);

          // Step 14: Check the "Electronic access" main column in preview (fields should be cleared - shown as dash)
          BulkEditSearchPane.verifyElectronicAccessColumnHeadersInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            instance.targetHoldingHRID,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            instance.targetHoldingHRID,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            testUri,
            '-',
            '-',
            '-',
          );
          // Verify administrative note was added to all holdings
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Step 15: Scroll down the "Preview of the records to be changed"
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(totalHoldings);
          BulkEditSearchPane.verifyAreYouSureFormScrollableVertically();

          // Step 16: Download preview in CSV format
          BulkEditActions.downloadPreview();

          const modifiedElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${testUri};-;-;-`;

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            modifiedElectronicAccessInFile,
          );
          // Verify administrative note was added to all holdings in CSV
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.previewRecordsCSV).then((path) => {
            cy.wrap(path).as('previewRecordsFixturePath');
          });

          // Step 17: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(totalHoldings);

          // Step 18: Check the "Electronic access" main column in changed records
          BulkEditSearchPane.verifyElectronicAccessColumnHeadersInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            instance.targetHoldingHRID,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            instance.targetHoldingHRID,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            testUri,
            '-',
            '-',
            '-',
          );
          // Verify administrative note was added to all holdings
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Step 19: Scroll down the "Preview of records changed"
          BulkEditSearchPane.verifyPaginatorInChangedRecords(totalHoldings);

          // Step 20: Click "Actions" menu => Uncheck "Electronic access" checkbox
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );

          // Step 21: Download changed records (CSV)
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            modifiedElectronicAccessInFile,
          );
          // Verify administrative note was added to all holdings in CSV
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.changedRecordsCSV).then((path) => {
            cy.wrap(path).as('changedRecordsFixturePath');
          });

          // Step 22: Navigate to "Logs" tab of Bulk edit
          BulkEditSearchPane.openLogsSearch();

          // Step 23: Check "Inventory - holdings" checkbox on "Record types" filter
          BulkEditLogs.checkHoldingsCheckbox();

          // Step 24: Click on the "..." action element in the row with the recently completed Bulk Edit job
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          // Step 25: Download "File with the matching records"
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            originalElectronicAccessInFile,
          );
          // Verify that file downloaded from logs has the same content as file from Step 7
          cy.get('@matchedRecordsFixturePath').then((matchedRecordsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              matchedRecordsFixturePath,
              `cypress/downloads/${fileNames.matchedRecordsCSV}`,
            );
          });

          // Step 26: Download "File with the preview of proposed changes (CSV)"
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            modifiedElectronicAccessInFile,
          );
          // Verify administrative note was added to all holdings in CSV
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });
          // Verify that file downloaded from logs has the same content as file from Step 16
          cy.get('@previewRecordsFixturePath').then((previewRecordsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              previewRecordsFixturePath,
              `cypress/downloads/${fileNames.previewRecordsCSV}`,
            );
          });

          // Step 27: Download "File with the updated records (CSV)"
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.targetHoldingHRID,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            modifiedElectronicAccessInFile,
          );
          // Verify administrative note was added to all holdings in CSV
          instance.holdingHRIDs.forEach((holdingHRID) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });
          // Verify that file downloaded from logs has the same content as file from Step 21
          cy.get('@changedRecordsFixturePath').then((changedRecordsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              changedRecordsFixturePath,
              `cypress/downloads/${fileNames.changedRecordsCSV}`,
            );
          });

          // Step 28: Navigate to "Inventory" app and verify changes made in process of bulk edit have been applied to all holdings
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByHRID(instance.instanceHRID);
          InventorySearchAndFilter.selectSearchResultItem();
          InventoryInstance.waitLoading();

          // Open target holding and verify electronic access and administrative note
          InventoryInstance.openHoldingViewByID(instance.targetHoldingId);
          HoldingsRecordView.checkElectronicAccess(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            testUri,
          );
          HoldingsRecordView.checkAdministrativeNote(administrativeNote);
          HoldingsRecordView.close();

          // Verify administrative note was added to all other holdings
          instance.holdingIds
            .filter((holdingId) => holdingId !== instance.targetHoldingId)
            .forEach((holdingId) => {
              InventoryInstance.openHoldingViewByID(holdingId);
              HoldingsRecordView.checkAdministrativeNote(administrativeNote);
              HoldingsRecordView.close();
            });
        },
      );
    },
  );
});
