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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let noteTypeId;
let servicePointId;
const noteType = `Dew;ey Dec|im:al class & ${getRandomPostfix()}`;
const itemNote = `Note with;special&characters) ${getRandomPostfix()}`;
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
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
        ItemNoteTypes.createItemNoteTypeViaApi(noteType).then((noteId) => {
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
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
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
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(noteType, 'Item temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(itemNote);

        const location = 'Online';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, location);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(location);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLocation(location);
        ItemRecordView.checkItemNote(itemNote, 'No', noteType);

        cy.getAdminToken();
        ItemNoteTypes.deleteItemNoteTypeViaApi(noteTypeId);

        cy.getToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');
        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Note', 'Item temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(item.hrid);

        const newLocation = 'Annex';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(newLocation);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLocation(newLocation);
      },
    );
  });
});
