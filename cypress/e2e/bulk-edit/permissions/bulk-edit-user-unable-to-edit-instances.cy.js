import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
let item;
let instanceHRIDFileName;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Permissions', () => {
      beforeEach('create test data', () => {
        item = {
          barcode: getRandomPostfix(),
          instanceName: `instance-${getRandomPostfix()}`,
        };
        instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.barcode,
          );
          cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${item.instanceId}"` }).then(
            (instance) => {
              item.instanceHRID = instance.hrid;
              FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, instance.hrid);
            },
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      });

      it(
        'C423644 User with "Bulk Edit: In app - View inventory records" and "Inventory: View instances, holdings, and items" permissions is NOT able to start bulk edit of Instances (firebird)',
        { tags: ['criticalPath', 'firebird', 'C423644'] },
        () => {
          BulkEditSearchPane.verifyBulkEditImage();
          BulkEditSearchPane.verifyPanesBeforeImport();
          BulkEditSearchPane.verifyBulkEditPaneItems();
          BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
          BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');
          BulkEditSearchPane.recordTypesAccordionExpanded();
          BulkEditSearchPane.verifyRecordIdentifierDisabled();
          BulkEditSearchPane.isDragAndDropAreaDisabled(true);
          BulkEditSearchPane.isHoldingsRadioChecked(false);
          BulkEditSearchPane.isInstancesRadioChecked(false);
          BulkEditSearchPane.isItemsRadioChecked(false);
          BulkEditSearchPane.verifyRadioHidden('Users');
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
          BulkEditSearchPane.verifyDefaultFilterState();
          BulkEditSearchPane.isDragAndDropAreaDisabled(true);
          BulkEditSearchPane.isHoldingsRadioChecked(false);
          BulkEditSearchPane.isInstancesRadioChecked(false);
          BulkEditSearchPane.isItemsRadioChecked(false);
          BulkEditSearchPane.verifyRecordIdentifierDisabled(true);
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
          BulkEditSearchPane.isDragAndDropAreaDisabled(true);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDFileName);
          BulkEditSearchPane.verifyMatchedResults(item.instanceHRID);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditActions.openActions();
          BulkEditActions.startBulkEditFolioInstanceAbsent();
          BulkEditActions.downloadMatchedRecordsExists();
        },
      );
    });
  },
);
