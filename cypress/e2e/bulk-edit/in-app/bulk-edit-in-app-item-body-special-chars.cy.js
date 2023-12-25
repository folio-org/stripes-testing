import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';

let user;
let noteTypeId;
let servicePointId;
const noteType = `Dew;ey Dec|im:al class & ${getRandomPostfix()}`;
const itemNote = `Note with;special&characters) ${getRandomPostfix()}`;
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const itemNormalNote = `itemNormalNote-${getRandomPostfix()}`;
const item = {
  instanceName: `item_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
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
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
          });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.hrid = res.hrid;
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
          },
        );
        ItemNoteTypes.createNoteTypeViaApi(noteType).then((noteId) => {
          noteTypeId = noteId;
        });
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        InventoryItems.edit();
        ItemRecordEdit.addItemsNotes(itemNote, noteType);
        cy.pause();
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        cy.visit(TopMenu.bulkEditPath);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
    });

    it(
      'C368480 Verify that there no errors during bulk editing if ITEMS body has special characters (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');
        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(noteType, 'Item temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(itemNote);

        const location = 'Online';
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, location);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(location);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLocation(location);
        ItemRecordView.checkItemNote(itemNote, 'No', noteType);

        cy.getAdminToken();
        ItemNoteTypes.deleteNoteTypeViaApi(noteTypeId);

        cy.getToken(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Note', 'Item temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(itemNote);

        const newLocation = 'Annex';
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(newLocation);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLocation(location);
        InventoryItems.edit();
        ItemRecordEdit.editItemNotes('Binding', itemNormalNote);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
      },
    );
  });
});
