import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-locations-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let sourceId;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${holdingUUIDsFileName}`;
const folioInstance = {
  title: `C494363 folio instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const marcInstance = {
  title: `C494363 marc instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const locationsInCollegeData = {};
const locationsInUniversityData = {};
const instances = [folioInstance, marcInstance];
const getReasonForErrorPermanentLocation = (holdingId, tenantName) => {
  return `${holdingId} cannot be updated because the record is associated with ${tenantName} and permanent location is not associated with this tenant.`;
};
const getReasonForErrorTemporaryLocation = (holdingId, tenantName) => {
  return `${holdingId} cannot be updated because the record is associated with ${tenantName} and temporary location is not associated with this tenant.`;
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditHoldings.gui,
            ]);
            cy.resetTenant();
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });

          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create shared folio instance
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
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.id = instanceId;
              });
            })
            .then(() => {
              // create holdings in College tenant
              cy.setTenant(Affiliations.College);

              InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
                locationsInCollegeData.permanentLocation = resp[0];
                locationsInCollegeData.temporaryLocation = resp[1];

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInCollegeData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIdsInCollege = holding.id;
                    instance.holdingHridsInCollege = holding.hrid;
                  });
                  cy.wait(1000);
                });
              });

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${marcInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(marcInstance.holdingIdsInCollege, {
                  ...holdings[0],
                  temporaryLocationId: locationsInCollegeData.temporaryLocation.id,
                });
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              InventoryInstances.getLocations({ limit: 3 }).then((resp) => {
                const locations = resp.filter((location) => location.name !== 'DCB');
                locationsInCollegeData.permanentLocation = locations[0];
                locationsInCollegeData.temporaryLocation = locations[1];
                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInUniversityData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIdsInUniversity = holding.id;
                    instance.holdingHridsInUniversity = holding.hrid;
                  });
                  cy.wait(1000);
                });
              });

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${folioInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(folioInstance.holdingIdsInUniversity, {
                  ...holdings[0],
                  temporaryLocationId: locationsInUniversityData.temporaryLocation.id,
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${folioInstance.holdingIdsInCollege}\r\n${folioInstance.holdingIdsInUniversity}\r\n${marcInstance.holdingIdsInCollege}\r\n${marcInstance.holdingIdsInUniversity}`,
              );
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIdsInCollege);
        });

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIdsInUniversity);
        });
        cy.resetTenant();
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C494363 Verify "Replace with" action for Holdings location in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494363'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInCollege,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInUniversity,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              locationsInCollegeData.permanentLocation.name,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              locationsInUniversityData.permanentLocation.name,
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.holdingHridsInCollege,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            locationsInCollegeData.temporaryLocation.name,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHridsInUniversity,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            locationsInUniversityData.temporaryLocation.name,
          );

          [folioInstance.holdingHridsInCollege, marcInstance.holdingHridsInUniversity].forEach(
            (holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
                '',
              );
            },
          );

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              locationsInCollegeData.permanentLocation.name,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              locationsInUniversityData.permanentLocation.name,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            marcInstance.holdingHridsInCollege,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            locationsInCollegeData.temporaryLocation.name,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHridsInUniversity,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            locationsInUniversityData.temporaryLocation.name,
          );

          [folioInstance.holdingHridsInCollege, marcInstance.holdingHridsInUniversity].forEach(
            (holdingHrid) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
                '',
              );
            },
          );

          // 6
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 7
          BulkEditActions.selectOption('Permanent holdings location');
          BulkEditSearchPane.verifyInputLabel('Permanent holdings location');
          BulkEditActions.replaceWithIsDisabled();

          // 8,9,10
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          SelectLocationsModal.verifySelectLocationModalExists();
          SelectLocationsModal.verifyLocationLookupModalElementsInCentralTenant();

          // 11
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            tenantNames.college,
            tenantNames.university,
          );

          // 12
          SelectLocationsModal.selectTenantInAffiliationDropdown(tenantNames.college);
          SelectLocationsModal.selectLocation(locationsInCollegeData.temporaryLocation.name);
          SelectLocationsModal.verifySelectLocationModalExists(false);

          BulkEditActions.verifySelectedLocation(
            `${locationsInCollegeData.temporaryLocation.name} (${Affiliations.College})`,
          );
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 13
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);

          // 14
          BulkEditActions.selectOption('Temporary holdings location', 1);
          BulkEditSearchPane.verifyInputLabel('Temporary holdings location', 1);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 15
          BulkEditActions.selectSecondAction('Replace with', 1);
          BulkEditActions.locationLookupExists();

          // 16
          BulkEditActions.clickLocationLookup(1);
          SelectLocationsModal.selectTenantInAffiliationDropdown(tenantNames.college);
          SelectLocationsModal.selectLocation(locationsInCollegeData.permanentLocation.name);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          BulkEditActions.verifySelectedLocation(
            `${locationsInCollegeData.permanentLocation.name} (${Affiliations.College})`,
            1,
          );
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 17
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);
          BulkEditActions.verifyAreYouSureForm(4);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: locationsInCollegeData.temporaryLocation.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
              value: locationsInCollegeData.permanentLocation.name,
            },
          ];

          const holdingHrids = [
            folioInstance.holdingHridsInCollege,
            folioInstance.holdingHridsInUniversity,
            marcInstance.holdingHridsInCollege,
            marcInstance.holdingHridsInUniversity,
          ];

          holdingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              holdingHrid,
              headerValuesToEdit,
            );
          });

          // 18
          BulkEditActions.downloadPreview();

          holdingHrids.forEach((holdingHrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
              headerValuesToEdit,
            );
          });

          // 19
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.holdingHridsInCollege,
              headerValuesToEdit,
            );
          });

          //  BulkEditSearchPane.verifyErrorLabel(4);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyReasonForError(
              instance.holdingIdsInUniversity,
              getReasonForErrorPermanentLocation(
                instance.holdingIdsInUniversity,
                Affiliations.University,
              ),
              getReasonForErrorTemporaryLocation(
                instance.holdingIdsInUniversity,
                Affiliations.University,
              ),
            );
          });

          // 22
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInCollege,
              headerValuesToEdit,
            );
          });

          // 23
          BulkEditActions.downloadErrors();

          instances.forEach((instance) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `${instance.holdingIdsInUniversity},${getReasonForErrorPermanentLocation(instance.holdingIdsInUniversity, Affiliations.University)}`,
              `${instance.holdingIdsInUniversity},${getReasonForErrorTemporaryLocation(instance.holdingIdsInUniversity, Affiliations.University)}`,
            ]);
          });

          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 4);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHridsInCollege);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkPermanentLocation(
              locationsInCollegeData.temporaryLocation.name,
            );
            HoldingsRecordView.checkTemporaryLocation(
              locationsInCollegeData.permanentLocation.name,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchHoldingsByHRID(folioInstance.holdingHridsInUniversity);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkPermanentLocation(
            locationsInUniversityData.permanentLocation.name,
          );
          HoldingsRecordView.checkTemporaryLocation(
            `${locationsInUniversityData.temporaryLocation.name} (${tenantNames.university})`,
          );
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchHoldingsByHRID(marcInstance.holdingHridsInUniversity);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkPermanentLocation(
            locationsInUniversityData.permanentLocation.name,
          );
          HoldingsRecordView.checkTemporaryLocation('-');
        },
      );
    });
  });
});
