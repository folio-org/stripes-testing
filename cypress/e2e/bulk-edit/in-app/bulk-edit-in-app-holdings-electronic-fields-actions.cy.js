import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  electronicAccessRelationshipId,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);
const firstElectronicAccess = {
  linkText: 'test-linkText',
  materialsSpecification: 'test-materialsSpecification',
  relationshipId: electronicAccessRelationshipId.RESOURCE,
  uri: 'testuri.com/uri',
};

const secondElectronicAccess = {
  linkText: 'test-linkText',
  materialsSpecification: 'Test-materialsSpecification',
  relationshipId: electronicAccessRelationshipId.RESOURCE,
  uri: 'testuri.com/uri',
};
const newElectronicAccessFields = {
  publicNote: 'Test URL public note',
  materialsSpecification: 'Test lower case: !,@,#,$,%,^,&,*,(,), {.[,]<},>,ø, Æ, §',
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
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
              electronicAccess: [firstElectronicAccess, secondElectronicAccess],
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
      'C877128 Verify Bulk Edit actions for electronic access fields (firebird)',
      { tags: ['criticalPath', 'firebird', 'C877128'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        let contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${firstElectronicAccess.uri};${firstElectronicAccess.linkText};${firstElectronicAccess.materialsSpecification};|${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${secondElectronicAccess.uri};${secondElectronicAccess.linkText};${secondElectronicAccess.materialsSpecification};",`;
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [contentToVerify]);
        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        [firstElectronicAccess, secondElectronicAccess].forEach((elAccess, index) => {
          const adjustedIndex = index + 1;
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            adjustedIndex,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, elAccess.uri, adjustedIndex);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            2,
            elAccess.linkText,
            adjustedIndex,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            3,
            elAccess.materialsSpecification,
            adjustedIndex,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, '', adjustedIndex);
        });
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('URL public note');
        let possibleActions = ['Clear field', 'Find', 'Replace with'];
        BulkEditActions.verifyTheActionOptions(possibleActions);
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.fillInSecondTextArea(newElectronicAccessFields.publicNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('URI', 1);
        BulkEditActions.selectSecondAction('Clear field', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Link text', 2);
        BulkEditActions.selectSecondAction('Find', 2);
        BulkEditActions.fillInFirstTextArea(firstElectronicAccess.linkText, 2);
        possibleActions = ['Remove', 'Replace with'];
        BulkEditActions.verifyTheSecondActionOptions(possibleActions, 2);
        BulkEditActions.selectSecondAction('Remove', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Materials specified', 3);
        BulkEditActions.selectSecondAction('Find', 3);
        BulkEditActions.fillInFirstTextArea(firstElectronicAccess.materialsSpecification, 3);
        BulkEditActions.selectSecondAction('Replace with', 3);
        BulkEditActions.fillInSecondTextArea(newElectronicAccessFields.materialsSpecification, 3);

        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          newElectronicAccessFields.materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          newElectronicAccessFields.publicNote,
        );

        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, '', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          newElectronicAccessFields.publicNote,
          2,
        );
        BulkEditActions.downloadPreview();
        contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};;;${newElectronicAccessFields.materialsSpecification};${newElectronicAccessFields.publicNote}|${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};;;${secondElectronicAccess.materialsSpecification};${newElectronicAccessFields.publicNote}",`;
        ExportFile.verifyFileIncludes(previewFileName, [contentToVerify]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          newElectronicAccessFields.materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          newElectronicAccessFields.publicNote,
        );

        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, '', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '', 2);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          2,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          newElectronicAccessFields.publicNote,
          2,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};;;${newElectronicAccessFields.materialsSpecification};${newElectronicAccessFields.publicNote}|${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};;;${secondElectronicAccess.materialsSpecification};${newElectronicAccessFields.publicNote}",`;
        ExportFile.verifyFileIncludes(changedRecordsFileName, [contentToVerify]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(1, '-');
        HoldingsRecordView.verifyElectronicAccessByElementIndex(2, '-');
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          3,
          newElectronicAccessFields.materialsSpecification,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          4,
          newElectronicAccessFields.publicNote,
        );

        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          1,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(1, '-', 1);
        HoldingsRecordView.verifyElectronicAccessByElementIndex(2, '-', 1);
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          3,
          secondElectronicAccess.materialsSpecification,
          1,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          4,
          newElectronicAccessFields.publicNote,
          1,
        );
      },
    );
  });
});
