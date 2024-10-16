import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import {
  APPLICATION_NAMES,
  electronicAccessRelationshipId,
  electronicAccessRelationshipName,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;
const electronicAccess = [
  {
    linkText: 'test-linkText',
    materialsSpecification: 'test-materialsSpecification',
    publicNote: 'test-publicNote',
    relationshipId: electronicAccessRelationshipId.RESOURCE,
    uri: 'testuri.com/uri',
  },
];
const newUri = 'testuri2.com/uri';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
          (holdings) => {
            item.holdingsHRID = holdings[0].hrid;
            FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              electronicAccess,
            });
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423494 Verify rendering Holdings electronic access properties while bulk edit Holdings electronic access (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423494'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        let contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.RESOURCE};${electronicAccess[0].uri};${electronicAccess[0].linkText};${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [contentToVerify]);
        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.checkboxWithTextAbsent('Relationship');
        BulkEditSearchPane.checkboxWithTextAbsent('URI');
        BulkEditSearchPane.checkboxWithTextAbsent('Link text');
        BulkEditSearchPane.checkboxWithTextAbsent('Materials specified');
        BulkEditSearchPane.checkboxWithTextAbsent('Public note');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, electronicAccess[0].linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.electronicAccessReplaceWith(
          'URL Relationship',
          electronicAccessRelationshipName.RESOURCE,
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
        BulkEditActions.addNewBulkEditFilterString();

        BulkEditActions.noteReplaceWith('URI', electronicAccess[0].uri, newUri, 1);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, newUri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, electronicAccess[0].linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
        BulkEditActions.downloadPreview();
        contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.VERSION_OF_RESOURCE};${newUri};${electronicAccess[0].linkText};${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(previewFileName, [contentToVerify]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, newUri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, electronicAccess[0].linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.VERSION_OF_RESOURCE};${newUri};${electronicAccess[0].linkText};${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(changedRecordsFileName, [contentToVerify]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          0,
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(1, newUri);
        HoldingsRecordView.verifyElectronicAccessByElementIndex(2, electronicAccess[0].linkText);
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(4, electronicAccess[0].publicNote);
      },
    );
  });
});
