import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOCATION_NAMES,
} from '../../../support/constants';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';

let user;
let locationId;
let locationName;
let resourceRelationshipId;
const item = {
  instanceName: `item-instanceName${getRandomPostfix()}`,
  itemBarcode: `item-itemBarcode${getRandomPostfix()}`,
};
const secondItem = {
  instanceName: `secondItem-instanceName${getRandomPostfix()}`,
  itemBarcode: `secondItem-itemBarcode${getRandomPostfix()}`,
};
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingsHRIDFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingsHRIDFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingsHRIDFileName);
let firstElectronicAccess;
const secondElectronicAccess = {
  materialsSpecification: 'secondElectronicAccess-materialsSpecification',
  publicNote: 'secondElectronicAccess-publicNote',
  uri: 'secondElectronicAccess.com/uri',
};
const getRowsInCsvFileMatchingHrids = (csvFileData, hrid) => {
  return csvFileData.filter(
    (row) => row[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID] === hrid,
  );
};
const verifyValuesInCsvFile = (
  fileNameToVerify,
  holdingElectronicAccessValue,
  permanentLocationValue,
) => {
  FileManager.convertCsvToJson(fileNameToVerify).then((csvFileData) => {
    const holdingRowWithElectronicAccess = getRowsInCsvFileMatchingHrids(
      csvFileData,
      item.holdingsHRID,
    );
    const holdingRowWithoutElectronicAccess = getRowsInCsvFileMatchingHrids(
      csvFileData,
      secondItem.holdingsHRID,
    );

    holdingRowWithElectronicAccess.forEach((holdingRow) => {
      cy.expect(
        holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
      ).to.equal(holdingElectronicAccessValue);
      cy.expect(
        holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION],
      ).to.equal(permanentLocationValue);
    });
    holdingRowWithoutElectronicAccess.forEach((holdingRow) => {
      cy.expect(
        holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS],
      ).to.equal('');
      cy.expect(
        holdingRow[BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION],
      ).to.equal(permanentLocationValue);
    });
  });
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        Locations.getViaApiAnyDefault().then((locations) => {
          locationId = locations[0].id;
          locationName = locations[0].name;

          UrlRelationship.getViaApi().then((relationships) => {
            const resourceRelationship = relationships.find(
              (rel) => rel.name === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            );
            resourceRelationshipId = resourceRelationship.id;

            firstElectronicAccess = {
              linkText: 'firstElectronicAccess-linkText',
              relationshipId: resourceRelationshipId,
              uri: 'firstElectronicAccess.com/uri',
            };
          });

          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
          );
          secondItem.instanceId = InventoryInstances.createInstanceViaApi(
            secondItem.instanceName,
            secondItem.itemBarcode,
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
            (holdings) => {
              item.holdingsHRID = holdings[0].hrid;
              FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, item.holdingsHRID);
              cy.updateHoldingRecord(holdings[0].id, {
                ...holdings[0],
                electronicAccess: [firstElectronicAccess, secondElectronicAccess],
                permanentLocationId: locationId,
                temporaryLocationId: locationId,
              });
            },
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${secondItem.instanceId}"` }).then(
            (holdings) => {
              secondItem.holdingsHRID = holdings[0].hrid;
              secondItem.holdingsUUID = holdings[0].id;
              FileManager.appendFile(
                `cypress/fixtures/${holdingsHRIDFileName}`,
                `\n${secondItem.holdingsHRID}`,
              );
              cy.updateHoldingRecord(holdings[0].id, {
                ...holdings[0],
                permanentLocationId: locationId,
                temporaryLocationId: locationId,
              });
            },
          );
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        holdingsHRIDFileName,
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423499 Verify rendering Holdings electronic access properties while bulk edit Holdings permanent location  (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423499'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Holdings permanent location');
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, firstElectronicAccess.uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, firstElectronicAccess.linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(3, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, '-');

        BulkEditSearchPane.verifyElectronicAccessElementByIndex(0, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, secondElectronicAccess.uri, 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          secondElectronicAccess.publicNote,
          2,
        );

        BulkEditSearchPane.verifyRowHasEmptyElectronicAccessInMatchAccordion(
          secondItem.holdingsHRID,
        );

        const holdingsElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${firstElectronicAccess.uri};${firstElectronicAccess.linkText};-;-|-;${secondElectronicAccess.uri};-;${secondElectronicAccess.materialsSpecification};${secondElectronicAccess.publicNote}`;

        verifyValuesInCsvFile(matchedRecordsFileName, holdingsElectronicAccessInFile, locationName);

        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID, secondItem.holdingsHRID);
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replacePermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2, LOCATION_NAMES.MAIN_LIBRARY_UI);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, firstElectronicAccess.uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, firstElectronicAccess.linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(3, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, '-');

        BulkEditSearchPane.verifyElectronicAccessElementByIndex(0, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, secondElectronicAccess.uri, 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          secondElectronicAccess.publicNote,
          2,
        );
        BulkEditSearchPane.verifyRowHasEmptyElectronicAccessInAreYouSureForm(
          secondItem.holdingsHRID,
        );
        BulkEditActions.downloadPreview();

        verifyValuesInCsvFile(
          previewFileName,
          holdingsElectronicAccessInFile,
          LOCATION_NAMES.MAIN_LIBRARY_UI,
        );

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, firstElectronicAccess.uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, firstElectronicAccess.linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(3, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, '-');

        BulkEditSearchPane.verifyElectronicAccessElementByIndex(0, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, secondElectronicAccess.uri, 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '-', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          secondElectronicAccess.publicNote,
          2,
        );
        BulkEditSearchPane.verifyRowHasEmptyElectronicAccessInChangedAccordion(
          secondItem.holdingsHRID,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        verifyValuesInCsvFile(
          changedRecordsFileName,
          holdingsElectronicAccessInFile,
          LOCATION_NAMES.MAIN_LIBRARY_UI,
        );

        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, LOCATION_NAMES.MAIN_LIBRARY_UI);

        // remove earlier dowloaded files
        FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          holdingsHRIDFileName,
          matchedRecordsFileName,
          changedRecordsFileName,
          previewFileName,
        );

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        BulkEditLogs.downloadFileUsedToTrigger();
        BulkEditFiles.verifyCSVFileRows(holdingsHRIDFileName, [
          item.holdingsHRID,
          secondItem.holdingsHRID,
        ]);

        BulkEditLogs.downloadFileWithMatchingRecords();

        verifyValuesInCsvFile(matchedRecordsFileName, holdingsElectronicAccessInFile, locationName);

        BulkEditLogs.downloadFileWithProposedChanges();

        verifyValuesInCsvFile(
          previewFileName,
          holdingsElectronicAccessInFile,
          LOCATION_NAMES.MAIN_LIBRARY_UI,
        );

        BulkEditLogs.downloadFileWithUpdatedRecords();

        verifyValuesInCsvFile(
          changedRecordsFileName,
          holdingsElectronicAccessInFile,
          LOCATION_NAMES.MAIN_LIBRARY_UI,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();

        [item.holdingsHRID, secondItem.holdingsHRID].forEach((hrid) => {
          InventorySearchAndFilter.searchByParameter('Holdings HRID', hrid);
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
          HoldingsRecordView.close();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
