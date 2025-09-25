import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import Affiliations from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import UrlRelationshipConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let sharedUrlRelationshipData;
const holdingIds = [];
const holdingHrids = [];
const folioInstance = {
  title: `C566156 folio instance testBulkEdit_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C566156 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `C566156 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `C566156 local urlRelationship ${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const electronicAccessTableHeaders =
  'URL relationshipURILink textMaterials specifiedURL public note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const getRowsInCsvFileMatchingHrids = (csvFileData, hrids) => {
  return csvFileData.filter((row) => {
    return hrids.some((hrid) => {
      return row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID].includes(hrid);
    });
  });
};

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // create shared url relationship in Central
        UrlRelationshipConsortiumManager.createViaApi(sharedUrlRelationship)
          .then((newUrlRelationship) => {
            sharedUrlRelationshipData = newUrlRelationship;
          })
          .then((newUrlRelationship) => {
            sharedUrlRelationshipData = newUrlRelationship;

            cy.withinTenant(Affiliations.College, () => {
              cy.createTempUser([
                permissions.bulkEditEdit.gui,
                permissions.uiInventoryViewCreateEditHoldings.gui,
              ]).then((userProperties) => {
                user = userProperties;

                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  instanceTypeId = instanceTypeData[0].id;
                });
                cy.getLocations({ query: 'name="DCB"' }).then((res) => {
                  locationId = res.id;
                });
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  sourceId = folioSource.id;
                });

                // create local url relationship in College
                UrlRelationship.createViaApi({
                  name: localUrlRelationship.name,
                  source: 'local',
                }).then((response) => {
                  localUrlRelationship.id = response.id;
                  // create holdings in College tenant
                  instances.forEach((instance) => {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: instance.title,
                      },
                    }).then((createdInstanceData) => {
                      instance.id = createdInstanceData.instanceId;
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instance.id,
                        permanentLocationId: locationId,
                        electronicAccess: [
                          {
                            linkText: 'College shared link text',
                            materialsSpecification: 'College shared materials specified',
                            publicNote: 'College shared url public note',
                            uri: 'https://college-shared-uri.com',
                            relationshipId: sharedUrlRelationshipData.settingId,
                          },
                          {
                            linkText: 'College link text',
                            materialsSpecification: 'College materials specified',
                            publicNote: 'College url public note',
                            uri: 'https://college-uri.com',
                            relationshipId: localUrlRelationship.id,
                          },
                        ],
                        sourceId,
                      }).then((holding) => {
                        holdingIds.push(holding.id);
                        holdingHrids.push(holding.hrid);
                      });
                    });
                    cy.wait(1000);
                  });

                  cy.then(() => {
                    FileManager.createFile(
                      `cypress/fixtures/${holdingUUIDsFileName}`,
                      `${holdingIds.join('\n')}`,
                    );
                  });
                });

                cy.resetTenant();
                cy.login(user.username, user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
              });
            });
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        UrlRelationshipConsortiumManager.deleteViaApi(sharedUrlRelationshipData);
        cy.withinTenant(Affiliations.College, () => {
          UrlRelationship.deleteViaApi(localUrlRelationship.id);
          Users.deleteViaApi(user.userId);

          instances.forEach((instance) => {
            InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
          });

          FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });
      });

      it(
        'C566156 Verify "Clear field" action for Holdings electronic access in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566156'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload .csv file with Holdings UUIDs
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);

          // Step 3: Check the result of uploading the .csv file
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(`${holdingIds.length} holdings`);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(holdingIds.length);

          // Step 4: Show "Electronic access" column
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );

          const holdingsElectronicAccess = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}https://college-shared-uri.comCollege shared link textCollege shared materials specifiedCollege shared url public note${localUrlRelationship.name}https://college-uri.comCollege link textCollege materials specifiedCollege url public note`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingsElectronicAccess,
            );
          });

          // Step 5: Hide "Electronic access" column and download matched records
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const holdingsElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};https://college-shared-uri.com;College shared link text;College shared materials specified;College shared url public note|${localUrlRelationship.name};https://college-uri.com;College link text;College materials specified;College url public note`;

          FileManager.convertCsvToJson(fileNames.matchedRecordsCSV).then((csvFileData) => {
            const holdingRows = getRowsInCsvFileMatchingHrids(csvFileData, holdingHrids);
            holdingRows.forEach((holdingRow) => {
              cy.expect(
                holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingsElectronicAccessInFile);
            });
          });

          // Step 6: Start in-app bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Steps 7-13: Add clear field actions for all electronic access fields
          const fieldsToClear = [
            'URL relationship',
            'URI',
            'Link text',
            'Materials specified',
            'URL public note',
          ];

          fieldsToClear.forEach((field, rowIndex) => {
            // Step 7-13: Select option and clear field for each
            BulkEditActions.selectOption(field, rowIndex);
            BulkEditActions.selectAction('Clear field', rowIndex);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            if (rowIndex < fieldsToClear.length - 1) {
              BulkEditActions.addNewBulkEditFilterString();
              BulkEditActions.verifyNewBulkEditRow(rowIndex + 1);
              BulkEditActions.verifyConfirmButtonDisabled(true);
            }
          });

          // Step 14: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(holdingIds.length);

          const updatedHoldingsElectronicAccess = electronicAccessTableHeaders;
          const updatedHoldingsElectronicAccessInFile = `${electronicAccessTableHeadersInFile};;;;|;;;;`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              updatedHoldingsElectronicAccess,
            );
          });

          BulkEditActions.verifyAreYouSureForm(holdingIds.length);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(holdingIds.length);

          // Step 15: Download preview
          BulkEditActions.downloadPreview();
          FileManager.convertCsvToJson(fileNames.previewRecordsCSV).then((csvFileData) => {
            const holdingRows = getRowsInCsvFileMatchingHrids(csvFileData, holdingHrids);
            holdingRows.forEach((holdingRow) => {
              cy.expect(
                holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(updatedHoldingsElectronicAccessInFile);
            });
          });

          // Step 16: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(holdingIds.length);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              updatedHoldingsElectronicAccess,
            );
          });

          // Step 17: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          FileManager.convertCsvToJson(fileNames.changedRecordsCSV).then((csvFileData) => {
            const holdingRows = getRowsInCsvFileMatchingHrids(csvFileData, holdingHrids);
            holdingRows.forEach((holdingRow) => {
              cy.expect(
                holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(updatedHoldingsElectronicAccessInFile);
            });
          });

          // Step 18: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkElectronicAccess('-', '-', '-', '-');
            HoldingsRecordView.checkElectronicAccess('-', '-', '-', '-', 1);
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
