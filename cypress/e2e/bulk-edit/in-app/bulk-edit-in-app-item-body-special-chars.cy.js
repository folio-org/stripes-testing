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
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let noteTypeId;
let servicePointId;
let noteType;
let itemNote;
let itemHRIDsFileName;
let item;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        // Recreate variables with fresh values for each retry
        noteType = `Dew;ey Dec|im:al class & ${getRandomPostfix()}`;
        itemNote = `Note with;special&characters) ${getRandomPostfix()}`;
        itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
        item = {
          instanceName: `AT_C368480_FolioInstance_${getRandomPostfix()}`,
          barcode: getRandomPostfix(),
        };
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          ServicePoints.getCircDesk1ServicePointViaApi()
            .then((servicePoint) => {
              servicePointId = servicePoint.id;
            })
            .then(() => {
              UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
            });

          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);

          ItemNoteTypes.createItemNoteTypeViaApi(noteType).then((noteId) => {
            noteTypeId = noteId;

            cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
              (itemData) => {
                item.hrid = itemData.hrid;

                // need to wait created item note type to be saved
                cy.wait(10_000);

                itemData.notes = [
                  {
                    itemNoteTypeId: noteTypeId,
                    note: itemNote,
                    staffOnly: false,
                  },
                ];

                cy.updateItemViaApi(itemData);

                FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
              },
            );
          });

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
        ItemNoteTypes.deleteItemNoteTypeViaApi(noteTypeId);
        FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
      });

      it(
        'C368480 Verify that there no errors during bulk editing if ITEMS body has special characters (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C368480'] },
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
          BulkEditActions.openStartBulkEditForm();
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

          cy.getToken(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');
          BulkEditSearchPane.uploadFile(itemHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(item.hrid);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Note', 'Item temporary location');
          BulkEditSearchPane.verifySpecificItemsMatched(item.hrid);

          const newLocation = 'Annex';
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.replaceTemporaryLocation(newLocation);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1, newLocation);
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyChangedResults(newLocation);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.verifyTemporaryLocation(newLocation);
        },
      );
    });
  },
);
