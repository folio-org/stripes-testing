import { including } from '@interactors/html';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectPermanentLocationModal from '../../../../support/fragments/bulk-edit/select-location-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  CAMPUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Institutions from '../../../../support/fragments/settings/tenant/location-setup/institutions';

let user;
let instanceTypeId;
let sourceId;
let locationData;
let altLocationData;
const folioInstance = {
  title: `AT_C566162_FolioInstance_${getRandomPostfix()}`,
  holdingId: null,
  holdingHrid: null,
};
const marcInstance = {
  title: `AT_C566162_MarcInstance_${getRandomPostfix()}`,
  holdingId: null,
  holdingHrid: null,
};
const instances = [folioInstance, marcInstance];
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          // Get two locations for testing replace
          InventoryInstances.getLocations({ query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` }).then(
            (resp) => {
              locationData = resp[0];
              locationData.campusName = CAMPUS_NAMES.CITY_CAMPUS;

              InventoryInstances.getLocations({
                query: `name=${LOCATION_NAMES.SECOND_FLOOR_UI}`,
              }).then((altLocationResp) => {
                altLocationData = altLocationResp[0];
                altLocationData.campusName = CAMPUS_NAMES.CITY_CAMPUS;

                Institutions.getInstitutionByIdViaApi(altLocationData.institutionId).then(
                  (institution) => {
                    altLocationData.institutionName = institution.name;
                  },
                );

                InventoryHoldings.getHoldingsFolioSource()
                  .then((folioSource) => {
                    sourceId = folioSource.id;
                  })
                  .then(() => {
                    // create folio instance
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: folioInstance.title,
                      },
                    }).then((createdInstanceData) => {
                      folioInstance.id = createdInstanceData.instanceId;
                    });
                  })
                  .then(() => {
                    // create marc instance
                    cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                      marcInstance.id = instanceId;
                    });
                  })
                  .then(() => {
                    // create holdings: one with temp location, one without
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: folioInstance.id,
                      permanentLocationId: locationData.id,
                      temporaryLocationId: locationData.id,
                      sourceId,
                    }).then((holding) => {
                      folioInstance.holdingId = holding.id;
                      folioInstance.holdingHrid = holding.hrid;
                    });
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: marcInstance.id,
                      permanentLocationId: locationData.id,
                      // No temporaryLocationId for this holding
                      sourceId,
                    }).then((holding) => {
                      marcInstance.holdingId = holding.id;
                      marcInstance.holdingHrid = holding.hrid;
                    });
                  })
                  .then(() => {
                    FileManager.createFile(
                      `cypress/fixtures/${holdingUUIDsFileName}`,
                      `${folioInstance.holdingId}\n${marcInstance.holdingId}`,
                    );
                    cy.resetTenant();
                    cy.login(user.username, user.password, {
                      path: TopMenu.bulkEditPath,
                      waiter: BulkEditSearchPane.waitLoading,
                    });
                    ConsortiumManager.switchActiveAffiliation(
                      tenantNames.central,
                      tenantNames.college,
                    );
                  });
              });
            },
          );
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
          });
          Users.deleteViaApi(user.userId);
        });
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566162 Verify "Replace with" action for Holdings location in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566162'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          // Step 4: Show columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );

          // Step 5: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              locationData.name,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            locationData.name,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            marcInstance.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            '',
          );

          // Step 6: Start bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7-9: Select Permanent holdings location
          BulkEditActions.selectOption('Permanent holdings location');
          BulkEditSearchPane.verifyInputLabel('Permanent holdings location');
          BulkEditActions.replaceWithIsDisabled();
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          BulkEditActions.verifyLocationLookupModal();
          SelectPermanentLocationModal.selectExistingHoldingsLocation(altLocationData);
          BulkEditActions.verifyLocationValue(including(altLocationData.name));
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10-14: Add new row for Temporary holdings location
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.replaceTemporaryLocation(altLocationData.name, 'holdings', 1);
          BulkEditActions.verifyLocationValue(including(altLocationData.name, 1));
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 15: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: altLocationData.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
              value: altLocationData.name,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.holdingHrid,
              headerValuesToEdit,
            );
          });

          // Step 16: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHrid,
              headerValuesToEdit,
            );
          });

          // Step 17: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.holdingHrid,
              headerValuesToEdit,
            );
          });

          // Step 18: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHrid,
              headerValuesToEdit,
            );
          });

          // Step 19: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkPermanentLocation(altLocationData.name);
            HoldingsRecordView.checkTemporaryLocation(altLocationData.name);
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
