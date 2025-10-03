import permissions from '../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const patronGroup = {
      name: getTestEntityValue('groupTags'),
    };
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
          cy.createTempUser(
            [permissions.uiTagsPermissionAll.gui, permissions.inventoryAll.gui],
            patronGroup.name,
          ).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoint.id,
              userData.userId,
              testData.servicePoint.id,
            );
          });
        });
    });

    beforeEach('Login', () => {
      cy.waitForAuthRefresh(() => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.inventoryPath);
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C343216 Filter Holdings by Tags (volaris)',
      { tags: ['extendedPath', 'volaris', 'C343216'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.filterByTag(tagName);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );

    it(
      'C343217 Filter Items by Tags (volaris)',
      { tags: ['extendedPath', 'volaris', 'C343217'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          testData.folioInstances[0].barcodes[0],
        );
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.filterByTag(tagName);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
