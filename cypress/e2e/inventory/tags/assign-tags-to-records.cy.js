import { APPLICATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
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
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
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
      'C196770 Assign tags to a Holdings record (volaris)',
      { tags: ['extendedPath', 'volaris', 'C196770', 'eurekaPhase1'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.filterHoldingsByTag(tagName);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        JobProfileView.removeTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyTagIsAbsent(tagName);
      },
    );

    it(
      'C367961 Verify that user can add more than 1 tag to "Holdings" record with source "Folio" (volaris)',
      { tags: ['extendedPath', 'volaris', 'C367961', 'eurekaPhase1'] },
      () => {
        const tags = [...Array(5)].map(() => `tag${getRandomStringCode(5)}`.toLowerCase());
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tags).each((tag) => {
          // cy.wait(200);
          // HoldingsRecordEdit.clearTagsInput();
          cy.wait(500);
          HoldingsRecordEdit.addTag(tag);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tags).each((tag) => {
          cy.wait(1000);
          JobProfileView.removeTag(tag);
        });
      },
    );

    it(
      'C196771 Assign tags to an Item record (volaris)',
      { tags: ['extendedPath', 'volaris', 'C196771', 'eurekaPhase1'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          testData.folioInstances[0].barcodes[0],
        );
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.filterItemsByTag(tagName);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(testData.folioInstances[0].barcodes[0]);
        // Wait for the item data to load instead of using cached data.
        cy.wait(1000);
        JobProfileView.removeTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyTagIsAbsent(tagName);
      },
    );
  });
});
