import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS, ITEM_STATUS_NAMES } from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      holdingCallNumber: `A 123.4.${randomFourDigitNumber()}`,
      itemCallNumber: `A 123.5.${randomFourDigitNumber()}`,
      callNumberTypeId: '03dd64d0-5626-4ecd-8ece-4531e0069f35',
      folioInstances: [],
      barcodes: [`451466${randomFourDigitNumber()}`, `451466${randomFourDigitNumber()}`],
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    const callNumberBrowseSettings = [
      {
        name: 'Dewey Decimal classification',
        callNumberTypes: ['Dewey Decimal classification'],
      },
      {
        name: 'Call numbers (all)',
        callNumberTypes: [],
      },
    ];

    before('Create test data', () => {
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
        cy.getMaterialTypes({ limit: 1 })
          .then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
            testData.materialType = materialTypes.name;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: `AT_C451466_instance_1_${randomFourDigitNumber()}`,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                  callNumber: testData.holdingCallNumber,
                  callNumberTypeId: testData.callNumberTypeId,
                },
              ],
              items: [
                {
                  barcode: testData.barcodes[0],
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  itemLevelCallNumberTypeId: testData.callNumberTypeId,
                },
              ],
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: `AT_C451466_Instance_2_${randomFourDigitNumber()}`,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                  callNumberTypeId: testData.callNumberTypeId,
                },
              ],
              items: [
                {
                  barcode: testData.barcodes[1],
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  itemLevelCallNumber: testData.itemCallNumber,
                  itemLevelCallNumberTypeId: testData.callNumberTypeId,
                },
              ],
            });
          });
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        callNumberBrowseSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.barcodes.forEach((barcode) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
      });
      callNumberBrowseSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
      });
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
      cy.deleteLoanType(testData.loanTypeId);
    });

    it(
      'C451466 Call number of not valid format and with selected "Dewey" call number type can be found via browse (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C451466'] },
      () => {
        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseCallNumber.waitForCallNumberToAppear(testData.holdingCallNumber);
        InventorySearchAndFilter.browseSearch(testData.holdingCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: testData.holdingCallNumber }],
        });
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseCallNumber.waitForCallNumberToAppear(testData.itemCallNumber);
        InventorySearchAndFilter.browseSearch(testData.itemCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: testData.itemCallNumber }],
        });
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(testData.holdingCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: testData.holdingCallNumber }],
        });
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(testData.itemCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: testData.itemCallNumber }],
        });
      },
    );
  });
});
