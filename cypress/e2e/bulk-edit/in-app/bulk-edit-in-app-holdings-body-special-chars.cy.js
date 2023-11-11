import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';

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

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        }).then(() => {
          UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
        });

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(
            `cypress/fixtures/${holdingsHRIDFileName}`,
            item.holdingHRID,
          );
        });
        InventoryInstances.createHoldingsNoteTypeViaApi(noteType).then((noteId) => {
          noteTypeId = noteId;
        });
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.addHoldingsNotes(holdingsNote, noteType);
        HoldingsRecordEdit.saveAndClose();
        cy.visit(TopMenu.bulkEditPath);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        item.itemBarcode,
      );
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
    });

    it(
      'C368479 Verify that there no errors during bulk editing if entry HOLDINGS body has special characters (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Notes', 'Temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(holdingsNote);

        const location = 'Online';
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, location);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(location);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        InventoryInstance.verifyHoldingsTemporaryLocation(location);
        InventoryInstance.closeHoldingsView();

        cy.getAdminToken();
        InventoryInstances.deleteHoldingsNoteTypeViaApi(noteTypeId);

        cy.getToken(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Notes', 'Temporary location');
        BulkEditSearchPane.verifySpecificItemsMatched(holdingsNote);

        const newLocation = 'Annex';
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(newLocation);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        InventoryInstance.verifyHoldingsTemporaryLocation(newLocation);
        HoldingsRecordView.edit();
        HoldingsRecordEdit.editHoldingsNotes('Binding', holdingsNormalNote);
        HoldingsRecordEdit.saveAndClose();
      },
    );
  });
});
