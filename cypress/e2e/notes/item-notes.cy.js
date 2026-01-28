import { APPLICATION_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const itemNote = {
      text: `Note 1 ${getRandomPostfix()}`,
      noteType: 'Binding',
      staffOnly: true,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.waitContentLoading();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C631 Item notes (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C631', 'eurekaPhase1'] },
      () => {
        // #1 Go to the **Inventory** app and search for your title. Click on the instance record and select a hyperlinked barcode from the **Item: barcode** table that will be visible in the rightmost pane
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          testData.folioInstances[0].barcodes[0],
        );
        ItemRecordView.waitLoading();
        // #2 Note the presence or lack of fields under the **Item notes** heading
        ItemRecordView.checkItemNote('-', '-');
        // #3 Click the caret to the right of the **Item record [Status]** at the top of the page and select **Edit**
        ItemRecordView.openItemEditForm(testData.folioInstances[0].instanceTitle);
        // #4 Click **Add note** under the **Item notes** heading to display a set of note fields.  Choose a **Note type** from the dropdown, enter a value into the **Note** field and select or skip the **Staff only** checkbox.  Add several notes with different combinations of values
        ItemRecordEdit.addNotes([itemNote]);
        // #5 Click **Save and close** when you have finished adding notes
        ItemRecordEdit.saveAndClose();
        ItemRecordView.checkItemNote(itemNote.text, 'Yes', itemNote.noteType);
        // #6 Click the caret to the right of the **Item record [Status]** at the top of the page and select **Edit**
        ItemRecordView.openItemEditForm(testData.folioInstances[0].instanceTitle);
        // #7 Click the trash can icon next to any of the sets of note fields to delete a note
        ItemRecordEdit.deleteNote();
        // #8 Click **Save and close** after deleting a note
        ItemRecordEdit.saveAndClose();
        ItemRecordView.checkItemNote('-', '-');
      },
    );
  });
});
