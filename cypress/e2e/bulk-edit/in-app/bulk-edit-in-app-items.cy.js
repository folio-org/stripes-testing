import { calloutTypes } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const validItemAccessionNumbersFileName = `validItemAccessionNumbers_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        FileManager.createFile(
          `cypress/fixtures/${invalidItemBarcodesFileName}`,
          `${item.itemBarcode}\r\n${invalidBarcode}`,
        );
        FileManager.createFile(`cypress/fixtures/${validItemBarcodesFileName}`, item.itemBarcode);

        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.accessionNumber = `testBulkEditAccessionNumber_${getRandomPostfix()}`;
            cy.updateItemViaApi(itemData);
            FileManager.createFile(
              `cypress/fixtures/${validItemAccessionNumbersFileName}`,
              itemData.accessionNumber,
            );
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    beforeEach('select item tab', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearchPane.checkItemsRadio();
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validItemAccessionNumbersFileName}`);
    });

    it(
      'C350905 Negative uploading file with identifiers -- In app approach (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        // try to upload empty file
        BulkEditSearchPane.uploadFile('empty.csv');
        InteractorsTools.checkCalloutMessage('The uploaded file is empty.', calloutTypes.error);
        InteractorsTools.closeCalloutMessage();

        const invalidFileWarning = 'Invalid file';
        // try to upload another extension
        BulkEditSearchPane.uploadFile('example.json');
        BulkEditSearchPane.verifyModalName(invalidFileWarning);

        BulkEditSearchPane.uploadFile(['empty.csv', 'example.json']);
        BulkEditSearchPane.verifyModalName(invalidFileWarning);
      },
    );

    it(
      'C357030 Verify Matched records label cleanup -- In -app approach (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);
        BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
        BulkEditSearchPane.verifyPaneRecordsCount(1);

        const newLocation = 'Annex';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(newLocation);
      },
    );

    it(
      'C356809 Verify uploading file with Item accession number (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Item accession number');

        BulkEditSearchPane.uploadFile(validItemAccessionNumbersFileName);
        BulkEditSearchPane.waitFileUploading();

        const newLocation = 'Online';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(newLocation);
      },
    );
  });
});
