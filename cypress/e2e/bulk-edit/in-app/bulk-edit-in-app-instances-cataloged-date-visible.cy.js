import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

let user;
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const todayDateLocalized = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const administrativeNote = `test note ${getRandomPostfix()}`;
const instance = {
  title: `AT_C648513_MarcInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create MARC instance with cataloged date
        cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
          instance.id = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            instance.hrid = instanceData.hrid;
            instanceData.catalogedDate = todayDate;
            cy.updateInstance(instanceData);
          });

          // Create CSV file with instance UUID
          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instance.id);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
    });

    it(
      'C648513 Verify Cataloged date is shown in Bulk edit query preview and in "Are you sure?" form for instance Bulk edits (firebird)',
      { tags: ['extendedPath', 'firebird', 'C648513'] },
      () => {
        // Step 1: Select "Inventory - instances" radio button => Select "Instance UUIDs" option
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload CSV file with valid Instances UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the CSV file with Instances UUIDs
        BulkEditSearchPane.verifyMatchedResults(instance.hrid);
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');

        // Step 4: Click "Actions" menu => Check "Cataloged date" checkbox
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE,
          todayDateLocalized,
        );

        // Step 5: Click "Actions" menu => Select "FOLIO Instances" under "Start bulk edit" label
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // Step 6: Set edit query for Administrative note
        BulkEditActions.addItemNote('Administrative note', administrativeNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Click "Confirm changes" button and inspect "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

        // Verify "Cataloged date" column is present in "Are you sure?" form
        const columnValuesToVerify = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: administrativeNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE,
            value: todayDateLocalized,
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          instance.hrid,
          columnValuesToVerify,
        );
        BulkEditActions.verifyAreYouSureForm(1);

        // Step 8: Click "Commit changes" button and inspect Confirmation screen
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          columnValuesToVerify,
        );

        // Step 9: Open "Inventory" app and check committed changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(instance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyAdministrativeNote(administrativeNote);
        InstanceRecordView.verifyCatalogedDate(todayDate);
      },
    );
  });
});
