import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import UrlRelationship from '../../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import UrlRelationshipConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let sharedUrlRelationshipData;
const holdingIds = [];
const holdingHrids = [];
const folioInstance = {
  title: `AT_C566159_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566159_MarcInstance_${getRandomPostfix()}`,
};
const sharedUrlRelationship = {
  payload: {
    name: `AT_C566159 shared urlRelationship ${getRandomPostfix()}`,
  },
};
const localUrlRelationship = {
  name: `AT_C566159 local urlRelationship ${getRandomPostfix()}`,
};
const localUrlRelationshipName = localUrlRelationship.name;
const electronicAccessFields = {
  uri: 'https://www.testuri.com/uri',
  linkText: 'te;st: [sample] li*nk$text',
  materialsSpecification: 'test materials specified',
  publicNote: 'url public note',
};
const electronicAccessFieldsEdited = {
  uri: 'https://www.testuri.com',
  linkText: 'te;st:  li*nk$text',
  materialsSpecification: ' materials specified',
  publicNote: 'url public ',
};
const instances = [folioInstance, marcInstance];
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const electronicAccessTableHeaders =
  'URL relationshipURILink textMaterials specifiedURL public note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // create shared url relationship in Central
        UrlRelationshipConsortiumManager.createViaApi(sharedUrlRelationship)
          .then((newUrlRelationship) => {
            sharedUrlRelationshipData = newUrlRelationship;
          })
          .then(() => {
            cy.createTempUser(userPermissions).then((userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);

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
                // create folio instance
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((createdInstanceData) => {
                  folioInstance.id = createdInstanceData.instanceId;
                  // create marc instance
                  cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                    marcInstance.id = instanceId;
                    // create holdings in College tenant for both instances
                    instances.forEach((instance) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instance.id,
                        permanentLocationId: locationId,
                        electronicAccess: [
                          {
                            ...electronicAccessFields,
                            relationshipId: sharedUrlRelationshipData.settingId,
                          },
                          {
                            ...electronicAccessFields,
                            relationshipId: localUrlRelationship.id,
                          },
                        ],
                        sourceId,
                      }).then((holding) => {
                        holdingIds.push(holding.id);
                        holdingHrids.push(holding.hrid);
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
                });
              });

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
        'C566159 Verify "Find & remove" action for Holdings electronic access in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566159'] },
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

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Show "Electronic access" column
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          );

          const holdingElectronicAccessFields = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFields.uri}${electronicAccessFields.linkText}${electronicAccessFields.materialsSpecification}${electronicAccessFields.publicNote}${localUrlRelationship.name}${electronicAccessFields.uri}${electronicAccessFields.linkText}${electronicAccessFields.materialsSpecification}${electronicAccessFields.publicNote}`;

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

          const holdingElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}|${localUrlRelationship.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;

          FileManager.convertCsvToJson(fileNames.matchedRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(
                row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
              ).to.equal(holdingElectronicAccessFieldsInFile);
            });
          });

          // Step 6: Start in-app bulk edit
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7: Select "URL relationship" from the "Electronic access" option
          BulkEditActions.selectOption('URL relationship');

          // Step 8: Select "Find (full field search)" action
          BulkEditActions.selectAction('Find (full field search)');
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 9: Check displayed URL relationship types (should only show local)
          BulkEditActions.checkTypeExists(localUrlRelationshipName);

          // Step 10: Select local URL relationship type
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationshipName);
          BulkEditActions.selectSecondAction('Remove');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11-14: Add new rows for URI, Link text, Materials specified, URL public note find & remove
          const bulkEditFilters = [
            { option: 'URI', value: '/uri' },
            { option: 'Link text', value: '[sample]' },
            {
              option: 'Materials specified',
              value: 'test',
            },
            { option: 'URL public note', value: 'note' },
          ];

          bulkEditFilters.forEach((filter, index) => {
            const rowIndex = index + 1;

            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(rowIndex);
            BulkEditActions.selectOption(filter.option, rowIndex);
            BulkEditActions.selectAction('Find', rowIndex);
            BulkEditActions.fillInFirstTextArea(filter.value, rowIndex);
            BulkEditActions.selectSecondAction('Remove', rowIndex);
            BulkEditActions.verifyConfirmButtonDisabled(false);
          });

          // Step 15: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(holdingIds.length);

          const editedElectronicAccess = `${electronicAccessTableHeaders}${sharedUrlRelationship.payload.name}${electronicAccessFieldsEdited.uri}${electronicAccessFieldsEdited.linkText}${electronicAccessFieldsEdited.materialsSpecification}${electronicAccessFieldsEdited.publicNote}${electronicAccessFieldsEdited.uri}${electronicAccessFieldsEdited.linkText}${electronicAccessFieldsEdited.materialsSpecification}${electronicAccessFieldsEdited.publicNote}`;
          const editedElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${sharedUrlRelationship.payload.name};${electronicAccessFieldsEdited.uri};${electronicAccessFieldsEdited.linkText};${electronicAccessFieldsEdited.materialsSpecification};${electronicAccessFieldsEdited.publicNote}|;${electronicAccessFieldsEdited.uri};${electronicAccessFieldsEdited.linkText};${electronicAccessFieldsEdited.materialsSpecification};${electronicAccessFieldsEdited.publicNote.trim()}`;

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedElectronicAccess,
            );
          });

          BulkEditActions.verifyAreYouSureForm(holdingIds.length);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 16: Download preview
          BulkEditActions.downloadPreview();
          FileManager.convertCsvToJson(fileNames.previewRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(row).to.have.property(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
                editedElectronicAccessInFile,
              );
            });
          });

          // Step 17: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(holdingIds.length);

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
              editedElectronicAccess,
            );
          });

          // Step 18: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          FileManager.convertCsvToJson(fileNames.changedRecordsCSV).then((csvFileData) => {
            csvFileData.forEach((row) => {
              cy.expect(row).to.have.property(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
                editedElectronicAccessInFile,
              );
            });
          });

          // Step 19: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkElectronicAccess(
              sharedUrlRelationshipData.payload.name,
              electronicAccessFieldsEdited.uri,
              electronicAccessFieldsEdited.linkText,

              electronicAccessFieldsEdited.publicNote,
            );
            HoldingsRecordView.verifyElectronicAccessByElementIndex(
              3,
              electronicAccessFieldsEdited.materialsSpecification,
            );

            // Local relationship fields have matched text removed
            HoldingsRecordView.checkElectronicAccess(
              '-',
              electronicAccessFieldsEdited.uri,
              electronicAccessFieldsEdited.linkText,
              electronicAccessFieldsEdited.publicNote,
              1,
            );
            HoldingsRecordView.verifyElectronicAccessByElementIndex(
              3,
              electronicAccessFieldsEdited.materialsSpecification,
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
