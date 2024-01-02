import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.hrid = res.hrid;
            // Annex
            res.temporaryLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
            InventoryItems.editItemViaApi(res);
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
    });

    it(
      'C388543 Verify preview of records switching between toggles (Items) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditSearchPane.openLogsSearch();

        const statuses = [
          'New',
          'Retrieving records',
          'Saving records',
          'Data modification',
          'Reviewing changes',
          'Completed',
          'Completed with errors',
          'Failed',
        ];
        statuses.forEach((status) => BulkEditSearchPane.checkLogsCheckbox(status));

        BulkEditSearchPane.checkHoldingsCheckbox();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.fillLogsStartDate(today, today);
        BulkEditSearchPane.applyStartDateFilters();
        BulkEditSearchPane.fillLogsEndDate(today, today);
        BulkEditSearchPane.applyEndDateFilters();
        BulkEditSearchPane.verifyLogResultsFound();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.resetAll();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.clearTemporaryLocation();
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.hrid);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        statuses.forEach((status) => BulkEditSearchPane.checkLogsCheckbox(status));
        BulkEditSearchPane.checkHoldingsCheckbox();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.fillLogsStartDate(today, today);
        BulkEditSearchPane.applyStartDateFilters();
        BulkEditSearchPane.fillLogsEndDate(today, today);
        BulkEditSearchPane.applyEndDateFilters();
        BulkEditSearchPane.verifyLogResultsFound();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyChangedResults(item.hrid);
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.resetAll();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyChangedResults(item.hrid);
      },
    );
  });
});
