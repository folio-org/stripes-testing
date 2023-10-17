import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    const testData = { csvFileName: 'cypress/fixtures/item_barcodes9.csv' };

    before('Create test data', () => {
      /*
       * Authorized user with permissions:
       * Bulk Edit: In app - View inventory records
       * Bulk Edit: In app - Edit inventory records
       * Inventory: View, create, edit, delete items
       * User has a .csv file with valid items barcodes. User can use attached .csv file.
       * User is on the Bulk Edit landing page
       */

      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C353652 Verify item status to In-app bulk edit form (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        // #1 * Select the "Inventory - items" radio button on the "Record types" accordion
        BulkEditSearchPane.checkItemsRadio();
        // * Select "Item barcode" option from the "Record identifier" dropdown
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        // * Landing page shows "Drag and drop or choose file with item barcode" text
        // * The button "or choose file" on the "Drag and drop" area gets active
        // * "The Drag and drop" area consists of the label with "Select a file with item barcode" text

        // #2 Upload a .csv file from Preconditions with valid Item barcodes by dragging it on the "Drag & drop" area
        // * The "Uploading <file name> and retrieving relevant data" message in the "Bulk edit" pane appears
        // * The progress bar starts running with "Retrieving" text below it

        // #3 Click "Actions" menu => Select "Start bulk edit"
        // * The "In-app bulk edit" form opens containing the "Bulk edits" accordion with following elements:
        //  * "Options" column with "Select option" dropdown
        //  * "Actions" column is not populated
        //  * "Plus" icon is enabled
        //  * "Garbage can" icon is disabled

        // #4 Select "Item status" option in the "Select option" dropdown
        // * "Select action" is filled with "Replace with" action (disabled)
        // * Following the "Replace with" action, the "Select item status" dropdown is displayed

        // #5 Click the "Select item status" dropdown
        // * "Select item status" dropdown is expanded
        // * The list of available "Select item status" options contains:
        //  * Available
        //  * Withdrawn
        //  * Missing
        //  * In process (non-requestable)
        //  * Intellectual item
        //  * Long missing
        //  * Restricted
        //  * Unavailable
        //  * Unknown
      },
    );
  });
});
