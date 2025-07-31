import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES, HOLDING_NOTES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        holdingsNotesOption: 'Holdings notes (all)',
        holdingsAdmNotesOption: 'Holdings administrative notes',
        allOption: 'All',
        searchQueries: [
          'HOLDINGS NOTE AND ADMNOTE CASE TEST',
          'holdings note and admnote case test',
        ],
        searchResultsAll: [
          'C466079 Instance 1, Holdings note lower case',
          'C466079 Instance 2, Holdings note UPPER case',
          'C466079 Instance 3, Holdings adm note lower case',
          'C466079 Instance 4, Holdings adm note UPPER case',
        ],
        searchResultsTwoRecords: [
          'C466079 Instance 3, Holdings adm note lower case',
          'C466079 Instance 4, Holdings adm note UPPER case',
        ],
        instances: [
          {
            title: 'C466079 Instance 1, Holdings note lower case',
            note: 'holdings note and admnote case test',
            barcode: `466079${randomFourDigitNumber()}`,
          },
          {
            title: 'C466079 Instance 2, Holdings note UPPER case',
            note: 'HOLDINGS NOTE AND ADMNOTE CASE TEST',
            barcode: `466079${randomFourDigitNumber()}`,
          },
          {
            title: 'C466079 Instance 3, Holdings adm note lower case',
            admNote: 'holdings note and admnote case test',
            barcode: `466079${randomFourDigitNumber()}`,
          },
          {
            title: 'C466079 Instance 4, Holdings adm note UPPER case',
            admNote: 'HOLDINGS NOTE AND ADMNOTE CASE TEST',
            barcode: `466079${randomFourDigitNumber()}`,
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
                    notes: [
                      {
                        holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                        note: testData.instances[0].note,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[0].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
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
                    notes: [
                      {
                        holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                        note: testData.instances[1].note,
                        staffOnly: false,
                      },
                    ],
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[1].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
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
                    administrativeNotes: [testData.instances[2].admNote],
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[2].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
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
                    administrativeNotes: [testData.instances[3].admNote],
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[3].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                  },
                ],
              });
            });
        });
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
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
        'C466079 Search by "Note" fields of "Holdings" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466079'] },
        () => {
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.holdingsNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[0]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.holdingsNotesOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueries[1]);
          testData.searchResultsAll.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.holdingsAdmNotesOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsTwoRecords.forEach((expectedResult) => {
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
