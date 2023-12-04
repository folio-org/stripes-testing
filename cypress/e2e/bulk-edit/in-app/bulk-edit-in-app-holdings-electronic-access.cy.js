import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let holdingsHRID;
const newRelationshipName = `newRelationshipName-${getRandomPostfix()}`;
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const calloutMessage = `The URL relationship term ${newRelationshipName} was successfully deleted`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.uiCreateEditDeleteURL.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` }).then((holdings) => {
          holdingsHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, holdingsHRID);
        });
        cy.login(user.username, user.password, {
          path: SettingsMenu.urlRelationshipPath,
          waiter: UrlRelationship.waitloading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C367977 Verify Bulk edit Holdings records with non-existent Electronic access Relationship type ID (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        UrlRelationship.createNewRelationship(newRelationshipName);
        UrlRelationship.verifyElectronicAccessNameOnTable(newRelationshipName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.bySource('FOLIO');
        InventorySearchAndFilter.searchHoldingsByHRID(holdingsHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.edit();
        HoldingsRecordView.addElectronicAccess(newRelationshipName);

        cy.visit(SettingsMenu.urlRelationshipPath);
        UrlRelationship.deleteUrlRelationship(newRelationshipName);
        InteractorsTools.checkCalloutMessage(calloutMessage);

        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditSearchPane.verifyReasonForError('Electronic access relationship not found by id=');

        const tempLocation = 'Online (E)';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(holdingsHRID);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        InventoryInstance.verifyHoldingsTemporaryLocation('Online');
      },
    );
  });
});
