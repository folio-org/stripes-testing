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
import UrlRelationshipConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import Affiliations from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let sharedUrlRelationshipData;
const holdingIds = [];
const holdingHrids = [];
const folioInstance = {
  title: `AT_C566157_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566157_MarcInstance_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `AT_C566157 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `AT_C566157 local urlRelationship ${getRandomPostfix()}`,
};
const localUrlRelationshipName = localUrlRelationship.name;
const electronicAccessFieldsFromUpperCase = {
  uri: 'HTTPS://www.testuri.com/uri',
  linkText: 'Te;st: [sample] li*nk$text',
  materialsSpecification: 'Test materials specified',
  publicNote: 'URL public note',
};
const electronicAccessFieldsFromLowerCase = {
  uri: 'https://www.testuri.com/uri',
  linkText: 'te;st: [sample] li*nk$text',
  materialsSpecification: 'test materials specified',
  publicNote: 'url public note',
};
const instances = [folioInstance, marcInstance];
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const electronicAccessTableHeaders =
  'URL relationshipURILink textMaterials specifiedURL public note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';

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
                            ...electronicAccessFieldsFromUpperCase,
                            relationshipId: sharedUrlRelationshipData.settingId,
                          },
                          {
                            ...electronicAccessFieldsFromLowerCase,
                            relationshipId: sharedUrlRelationshipData.settingId,
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
        'C566157 Verify "Find & replace" action for Holdings electronic access in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566157'] },
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

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // Step 4: Show "Electronic access" column
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );

          const electronicAccessFieldsFromUpperCaseToString = Object.values(
            electronicAccessFieldsFromUpperCase,
          ).join('');
          const electronicAccessFieldsFromLowerCaseToString = Object.values(
            electronicAccessFieldsFromLowerCase,
          ).join('');
          const holdingElectronicAccessFields = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromUpperCaseToString}${sharedUrlRelationship.payload.name}${electronicAccessFieldsFromLowerCaseToString}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFields,
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

          const electronicAccessFieldsFromUpperCaseToStringInFile = Object.values(
            electronicAccessFieldsFromUpperCase,
          ).join(';');
          const electronicAccessFieldsFromLowerCaseToStringInFile = Object.values(
            electronicAccessFieldsFromLowerCase,
          ).join(';');
          const holdingElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromUpperCaseToStringInFile}|${sharedUrlRelationship.payload.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;

          FileManager.convertCsvToJson(fileNames.matchedRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(
                row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingElectronicAccessFieldsInFile);
            });
          });

          // Step 6: Start in-app bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7: Select "URL relationship" from the "Electronic access" option
          BulkEditActions.selectOption('URL relationship');
          // Step 8: Select "Find (full field search)" action
          BulkEditActions.selectAction('Find (full field search)');
          // Step 9: Check displayed URL relationship types (should only show local)
          BulkEditActions.checkTypeExists(localUrlRelationshipName);
          // Step 10: Select shared URL relationship type (should not be available, so select local)
          BulkEditActions.selectFromUnchangedSelect(sharedUrlRelationship.payload.name);
          // Step 11: Select "Replace with" action
          BulkEditActions.selectAction('Replace with');
          // Step 12: Select local URL relationship type
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationshipName);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13-17: Add new row for URI find & replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteReplaceWith(
            'URI',
            electronicAccessFieldsFromUpperCase.uri,
            electronicAccessFieldsFromLowerCase.uri,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 18: Add new row for Link text find & replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteReplaceWith(
            'Link text',
            electronicAccessFieldsFromUpperCase.linkText,
            electronicAccessFieldsFromLowerCase.linkText,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 19: Add new row for Materials specified find & replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.noteReplaceWith(
            'Materials specified',
            electronicAccessFieldsFromUpperCase.materialsSpecification,
            electronicAccessFieldsFromLowerCase.materialsSpecification,
            3,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 20: Add new row for URL public note find & replace
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(4);
          BulkEditActions.noteReplaceWith(
            'URL public note',
            electronicAccessFieldsFromUpperCase.publicNote,
            electronicAccessFieldsFromLowerCase.publicNote,
            4,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 21: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(holdingIds.length);

          const holdingElectronicAccessFieldsToEdit = `${electronicAccessTableHeaders}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}${localUrlRelationship.name}${electronicAccessFieldsFromLowerCaseToString}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFieldsToEdit,
            );
          });

          // Step 22: Download preview
          BulkEditActions.downloadPreview();

          const holdingElectronicAccessFieldsToEditInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}|${localUrlRelationship.name};${electronicAccessFieldsFromLowerCaseToStringInFile}`;

          FileManager.convertCsvToJson(fileNames.previewRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(row).to.have.property(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
                holdingElectronicAccessFieldsToEditInFile,
              );
            });
          });

          // Step 23: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(holdingIds.length);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              holdingElectronicAccessFieldsToEdit,
            );
          });

          // Step 24: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          FileManager.convertCsvToJson(fileNames.changedRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(row).to.have.property(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
                holdingElectronicAccessFieldsToEditInFile,
              );
            });
          });

          // Step 25: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkElectronicAccess(
              localUrlRelationshipName,
              electronicAccessFieldsFromLowerCase.uri,
              electronicAccessFieldsFromLowerCase.linkText,
              electronicAccessFieldsFromLowerCase.publicNote,
            );
            HoldingsRecordView.verifyElectronicAccessByElementIndex(
              3,
              electronicAccessFieldsFromLowerCase.materialsSpecification,
              0,
            );
            HoldingsRecordView.checkElectronicAccess(
              localUrlRelationshipName,
              electronicAccessFieldsFromLowerCase.uri,
              electronicAccessFieldsFromLowerCase.linkText,
              electronicAccessFieldsFromLowerCase.publicNote,
              1,
            );
            HoldingsRecordView.verifyElectronicAccessByElementIndex(
              3,
              electronicAccessFieldsFromLowerCase.materialsSpecification,
              1,
            );
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
