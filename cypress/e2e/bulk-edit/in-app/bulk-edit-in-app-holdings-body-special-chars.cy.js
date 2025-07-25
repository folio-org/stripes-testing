import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let noteTypeId;
let servicePointId;
const noteType = `Dew;ey Dec|im:al class & ${getRandomPostfix()}`;
const holdingsNote = `Note with;special&characters) ${getRandomPostfix()}`;
const holdingsHRIDFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const holdingsNormalNote = `holdingsNormalNote-${getRandomPostfix()}`;
const item = {
  instanceName: `item_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
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

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );

        InventoryInstances.createHoldingsNoteTypeViaApi(noteType).then((noteId) => {
          noteTypeId = noteId;
        });
        cy.wait(2000);
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, item.holdingHRID);

          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            notes: [
              {
                holdingsNoteTypeId: noteTypeId,
                note: holdingsNote,
                staffOnly: false,
              },
            ],
          });
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
    });

    it(
      'C368479 Verify that there no errors during bulk editing if entry HOLDINGS body has special characters (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368479'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.openActionsIfNotYet();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Note',
          'Holdings temporary location',
          noteType,
        );
        BulkEditSearchPane.verifySpecificItemsMatched(holdingsNote);

        const location = 'Online';
        BulkEditActions.openActionsIfNotYet();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, location);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(location);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        InventoryInstance.verifyHoldingsTemporaryLocation(location);
        InventoryInstance.closeHoldingsView();

        cy.getAdminToken();
        InventoryInstances.deleteHoldingsNoteTypeViaApi(noteTypeId);

        cy.getToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Note', 'Holdings temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(item.holdingHRID);

        const newLocation = 'Annex';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(newLocation);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstance.openHoldingView();
        InventoryInstance.verifyHoldingsTemporaryLocation(newLocation);
        HoldingsRecordView.edit();
        HoldingsRecordEdit.editHoldingsNotes(holdingsNormalNote, 'Binding');
        HoldingsRecordEdit.saveAndClose();
      },
    );
  });
});
