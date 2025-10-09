import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
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

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
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
            delete holdings[0].temporaryLocationId;
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
            });
          })
          .then(() => {
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
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380576 Verify that Holdings records are displayed in the Errors with "No change in value required" reason if no changes were made (firebird)',
      { tags: ['criticalPath', 'firebird', 'C380576'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(permanentLocation);

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replacePermanentLocation(permanentLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyReasonForError(ERROR_MESSAGES.NO_CHANGE_REQUIRED);
      },
    );
  });
});
