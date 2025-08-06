import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES, ITEM_NOTES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        itemNotesOption: 'Item notes (all)',
        itemAdmNotesOption: 'Item administrative notes',
        circulationNotesOption: 'Circulation notes',
        allOption: 'All',
        searchQueries: ['ITEM NOTE AND ADMNOTE CASE TEST', 'item note and admnote case test'],
        searchResultsAll: [
          'C466083 Instance 1, Item note lower case',
          'C466083 Instance 2, Item note UPPER case',
          'C466083 Instance 3, Item adm note lower case',
          'C466083 Instance 4, Item adm note UPPER case',
          'C466083 Instance 5, Item circ note lower case',
          'C466083 Instance 6, Item circ note UPPER case',
        ],
        searchResults3thAnd4thRecords: [
          'C466083 Instance 3, Item adm note lower case',
          'C466083 Instance 4, Item adm note UPPER case',
        ],
        searchResults5thAnd6thRecords: [
          'C466083 Instance 5, Item circ note lower case',
          'C466083 Instance 6, Item circ note UPPER case',
        ],
        instances: [
          {
            title: 'C466083 Instance 1, Item note lower case',
            note: 'item note and admnote case test',
            barcode: `466083${randomFourDigitNumber()}`,
          },
          {
            title: 'C466083 Instance 2, Item note UPPER case',
            note: 'ITEM NOTE AND ADMNOTE CASE TEST',
            barcode: `466083${randomFourDigitNumber()}`,
          },
          {
            title: 'C466083 Instance 3, Item adm note lower case',
            admNote: 'item note and admnote case test',
            barcode: `466083${randomFourDigitNumber()}`,
          },
          {
            title: 'C466083 Instance 4, Item adm note UPPER case',
            admNote: 'ITEM NOTE AND ADMNOTE CASE TEST',
            barcode: `466083${randomFourDigitNumber()}`,
          },
          {
            title: 'C466083 Instance 5, Item circ note lower case',
            circNote: 'item note and admnote case test',
            barcode: `466083${randomFourDigitNumber()}`,
          },
          {
            title: 'C466083 Instance 6, Item circ note UPPER case',
            circNote: 'ITEM NOTE AND ADMNOTE CASE TEST',
            barcode: `466083${randomFourDigitNumber()}`,
          },
        ],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      before(() => {
        cy.getAdminToken().then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.createLoanType({
            name: getTestEntityValue('type'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
          });
          cy.getDefaultMaterialType()
            .then((materialTypes) => {
              testData.materialTypeId = materialTypes.id;
              testData.materialType = materialTypes.name;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[0].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[0].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    notes: [
                      {
                        itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                        note: testData.instances[0].note,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[1].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[1].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    notes: [
                      {
                        itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                        note: testData.instances[1].note,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[2].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[2].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    administrativeNotes: [testData.instances[2].admNote],
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[3].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[3].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    administrativeNotes: [testData.instances[3].admNote],
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[4].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[4].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    circulationNotes: [
                      {
                        noteType: 'Check in',
                        note: testData.instances[4].circNote,
                      },
                    ],
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[5].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[5].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    circulationNotes: [
                      {
                        noteType: 'Check in',
                        note: testData.instances[5].circNote,
                      },
                    ],
                  },
                ],
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

      after(() => {
        cy.getAdminToken();
        testData.instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.barcode);
        });
        ServicePoints.deleteViaApi(testData.userServicePoint.id);
        Locations.deleteViaApi(testData.defaultLocation);
        Users.deleteViaApi(testData.user.userId);
        cy.deleteLoanType(testData.loanTypeId);
      });

      it(
        'C466083 Search by "Note" fields of "Item" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466083'] },
        () => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.itemNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[0]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.itemNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[1]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.itemAdmNotesOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults3thAnd4thRecords.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.circulationNotesOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults5thAnd6thRecords.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsAll.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
        },
      );
    });
  });
});
