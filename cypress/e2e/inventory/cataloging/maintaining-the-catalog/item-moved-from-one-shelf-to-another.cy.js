import { Permissions } from '../../../../support/dictionary';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    const testData = {
      callNumber: `${randomFourDigitNumber()}`,
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);

        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[0].instanceId,
        );
        Locations.deleteViaApi(testData.location);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C3500 An item is being moved from one shelf to another. Change the call number of the associated holdings record! (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C3500'] },
      () => {
        // Find the instance from precondition
        InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstances[0].instanceTitle);

        // Click on the instance name -> Click on "View holdings"
        InventoryInstance.openHoldingView();

        // Click on "Actions" menu, Select "Edit"
        InventoryInstance.edit();

        // Change the Call number -> Click "Save & Close" button
        HoldingsRecordEdit.fillCallNumber(testData.callNumber);
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.close();
        InventoryInstance.checkIsHoldingsCreated([
          `${testData.location.name} >  ${testData.callNumber}`,
        ]);
      },
    );
  });
});
