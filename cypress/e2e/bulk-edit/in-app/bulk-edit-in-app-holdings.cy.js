import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import Users from '../../../support/fragments/users/users';

let user;
let hrid;
const itemBarcode = getRandomPostfix();
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const validHoldingHRIDsFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
// const resultFileName = `matchedRecords_${getRandomPostfix()}.csv`;
const resultFileName = '*Matched-Records*';
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: itemBarcode,
  itemBarcode2: `secondBarcode_${itemBarcode}`
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          // cy.login(user.username, user.password, {
          //   path: TopMenu.bulkEditPath,
          //   waiter: BulkEditSearchPane.waitLoading
          // });
          cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          // Create file with valid holdings UUIDs
          const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode1);
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instanceId}"`
          })
            .then(holdings => {
              hrid = holdings[0].hrid;
              FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
              FileManager.createFile(`cypress/fixtures/${validHoldingHRIDsFileName}`, hrid);
            });
        });
    });

    beforeEach('select holdings', () => {
      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode1);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingHRIDsFileName}`);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    afterEach('open new bulk edit', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it('C357052 Verify Downloaded matched records if identifiers return more than one item (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(hrid);

      BulkEditActions.downloadMatchedResults(resultFileName);
      BulkEditFiles.verifyMatchedResultFileContent(resultFileName, [hrid], 'hrid');
    });

    it('C356810 Verify uploading file with holdings UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(hrid);

      const location = 'Online';

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.replaceTemporaryLocation(location, 'holdings');
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyChangedResults(location);
      BulkEditActions.verifySuccessBanner(1);
    });

    it('C360114 Verify that User can upload file with Holdings UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      [
        'Holdings HRID',
        'Permanent location',
        'Temporary location',
        'Call number prefix',
        'Call number',
        'Call number suffix',
        'Holdings type'
      ].forEach(title => {
        BulkEditSearchPane.verifyResultColumTitles(title);
      });
      BulkEditActions.openActions();
      BulkEditSearchPane.verifyHoldingActionShowColumns();
      BulkEditSearchPane.changeShowColumnCheckbox('Call number type');
      BulkEditSearchPane.verifyResultColumTitles('Call number type');
    });

    it('C360120 Verify that User can trigger bulk of holdings with file containing Holdings identifiers (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

      BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(hrid);

      const tempLocation = 'Annex';
      const permLocation = 'Main Library';

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();

      BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings');
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replaceSecondPermanentLocation(permLocation, 'holdings');

      BulkEditActions.confirmChanges();
      BulkEditActions.clickKeepEditingBtn();

      BulkEditActions.confirmChanges();
      BulkEditActions.clickX();

      BulkEditActions.confirmChanges();
      BulkEditActions.verifyAreYouSureForm(1, hrid);

      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyChangedResults(tempLocation);
      BulkEditSearchPane.verifyChangedResults(permLocation);
      BulkEditActions.verifySuccessBanner(1);
    });
  });
});
