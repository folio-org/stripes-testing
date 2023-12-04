import { DevTeams, TestTypes } from '../../support/dictionary';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;

describe('Bulk Edits', () => {
  describe('Bulk Edit - Items', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
        permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C374177 Verify default state switching between record types (firebird)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        // #1 Select the "Inventory-items" radio button on the "Record types" accordion
        BulkEditSearchPane.checkItemsRadio();
        // * "Select record identifier" is displayed as the first option in the "Record identifier" dropdown
        BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
        // * The "Drag and Drop" area is inactive
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        // * The landing page text reads: "Select a "record identifier" when on the Identifier tab."
        BulkEditSearchPane.verifyBulkEditPaneItems();
        // * The "Drag and Drop" area text reads: Select a file with record identifiers
        BulkEditSearchPane.verifyDragNDropUpdateUsersArea();

        // #2 Select the "Items UUIDs" option from the "Record identifier" dropdown
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        // * Landing page shows "Drag and drop or choose file with items UUIDs" text
        BulkEditSearchPane.verifyInputLabel('Drag and drop or choose file with item UUIDs');
        // * The button "or choose file" on the "Drag and drop" area get active
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        // * "The Drag and drop" area consist of the label with "Select a file with items UUIDs" text
        BulkEditSearchPane.verifyInputLabel('Select a file with item UUIDs');

        // #3 Select the "Inventory-holdings" radio button on  the "Record types" accordion
        BulkEditSearchPane.checkHoldingsRadio();
        // * The "Inventory-holdings" radio button is selected
        BulkEditSearchPane.isHoldingsRadioChecked(true);
        // * The landing page text reads: "Select a "record identifier" when on the Identifier tab."
        BulkEditSearchPane.verifyBulkEditPaneItems();
        // * The "Drag and Drop" area text reads: Select a file with record identifiers,
        BulkEditSearchPane.verifyDragNDropUpdateUsersArea();
        // * The button "or choose file" on the is inactive
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // #4 Select the "Instance HRIDs" option from the "Record identifier" dropdown
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        // * Landing page shows "Drag and drop or choose file with  Instance HRIDs" text
        // * "The Drag and drop" area consist of the label with "Select a file with Instance HRIDs" text
        BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
        // * The button "or choose file" on the "Drag and drop" area get active
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // #5 Select the "Inventory-items" radio button on the "Record types" accordion
        BulkEditSearchPane.checkItemsRadio();
        // * "Select record identifier" is displayed as the first option in the "Record identifier" dropdown
        BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
        // * The "Drag and Drop" area is inactive
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        // * The landing page text reads: "Select a "record identifier" when on the Identifier tab."
        BulkEditSearchPane.verifyBulkEditPaneItems();
        // * The "Drag and Drop" area text reads: Select a file with record identifier
        BulkEditSearchPane.verifyDragNDropUpdateUsersArea();
      },
    );
  });
});
