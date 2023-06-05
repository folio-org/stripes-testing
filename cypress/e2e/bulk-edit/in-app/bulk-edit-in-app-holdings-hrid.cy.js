import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let holdingsHRID;
let permanentLocation;
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk Edit - Holdings', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading
        });

        const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` })
          .then(holdings => {
            holdingsHRID = holdings[0].hrid;
            cy.getLocations({ limit: 1, query: `id="${holdings[0].permanentLocationId}"` })
              .then(location => { permanentLocation = location.name; });
            FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, holdingsHRID);
          })
          .then(() => {
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(holdingsHRID);
            InventoryInstance.openHoldingView();
            HoldingsRecordView.edit();
            HoldingsRecordEdit.clearTemporaryLocation();
            HoldingsRecordEdit.saveAndClose();
            cy.visit(TopMenu.bulkEditPath);
          });
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
    Users.deleteViaApi(user.userId);
  });

  it('C380576 Verify that Holdings records are displayed in the Errors with "No change in value required" reason if no changes were made (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    BulkEditSearchPane.checkHoldingsRadio();
    BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
    BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditSearchPane.verifyMatchedResults(holdingsHRID);

    BulkEditActions.openActions();
    BulkEditActions.openInAppStartBulkEditFrom();
    BulkEditActions.replacePermanentLocation(permanentLocation, 'holdings');
    BulkEditActions.confirmChanges();
    BulkEditActions.commitChanges();
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyReasonForError('No change in value required');
  });
});
