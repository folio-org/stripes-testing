import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
let holdingsHRID;
const newRelationshipName = `newRelationshipName-${getRandomPostfix()}`;
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const calloutMessage = `The URL relationship term ${newRelationshipName} was successfully deleted`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
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
        cy.wait(5000);
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
      { tags: ['criticalPath', 'firebird', 'C367977'] },
      () => {
        UrlRelationship.createNewRelationship(newRelationshipName);
        UrlRelationship.verifyElectronicAccessNameOnTable(newRelationshipName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.searchHoldingsByHRID(holdingsHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.addElectronicAccess(newRelationshipName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        UrlRelationship.openTabFromInventorySettingsList();
        UrlRelationship.deleteUrlRelationship(newRelationshipName);
        InteractorsTools.checkCalloutMessage(calloutMessage);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditSearchPane.verifyReasonForError('Electronic access relationship not found by id=');

        const tempLocation = 'Online (E)';

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(holdingsHRID);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        cy.reload();
        InventoryInstance.verifyHoldingsTemporaryLocation('Online');
      },
    );
  });
});
