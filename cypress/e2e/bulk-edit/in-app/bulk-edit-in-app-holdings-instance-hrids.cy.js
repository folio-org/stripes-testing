import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let permanentLocation;
const instanceHRIDFileName = `instanceHRIDFileName${getRandomPostfix()}.csv`;
const item = {
  itemBarcode: getRandomPostfix(),
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  instanceHRID: '',
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getInstanceById(instanceId).then((instance) => {
          item.instanceHRID = instance.hrid;
          FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, item.instanceHRID);
        });
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` })
          .then((holdings) => {
            cy.getLocations({ limit: 1, query: `id="${holdings[0].permanentLocationId}"` }).then(
              (location) => {
                permanentLocation = location.name;
              },
            );
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.byKeywords(item.instanceName);
            InventoryInstance.openHoldingView();
            HoldingsRecordView.edit();
            HoldingsRecordEdit.clearTemporaryLocation();
            HoldingsRecordEdit.saveAndClose();
            cy.visit(TopMenu.bulkEditPath);
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380576 Verify that Holdings records are displayed in the Errors with "No change in value required" reason if no changes were made (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(permanentLocation);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replacePermanentLocation(permanentLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyReasonForError('No change in value required');
      },
    );
  });
});
