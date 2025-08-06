import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      localCNtypeName: `C396366 Local type ${randomFourDigitNumber()}`,
    };
    const instances = [
      {
        title: `C396366_autotest_instance_${getRandomPostfix()}`,
      },
    ];
    const callNumbers = [
      { type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL, value: '396.366' },
      { type: CALL_NUMBER_TYPE_NAMES.SUDOC, value: 'J39.6:D38/366' },
      { type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE, value: 'QS 39 .GA6 Q3 1366' },
      { type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, value: 'PN3 .A9' },
      { type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, value: 'X SILVERHAND' },
      { type: testData.localCNtypeName, value: 'MYLCN396366' },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          CallNumberTypes.createCallNumberTypeViaApi({ name: testData.localCNtypeName }).then(
            (id) => {
              testData.callNumberTypeLocalId = id;
            },
          );
          cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
            instances[0].instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            instances[0].holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            instances[0].locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            instances[0].loanTypeId = res[0].id;
            instances[0].loanTypeName = res[0].name;
          });
          cy.getDefaultMaterialType().then((res) => {
            instances[0].materialTypeId = res.id;
          });
          InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
            testData.callNumberTypes = res;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          instances[0].defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(instances[0].defaultLocation);
        })
        .then(() => {
          const callNumberTypeDeweyId = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[0].type,
          ).id;
          const callNumberTypeSuDocId = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[1].type,
          ).id;
          const callNumberTypeNLMId = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[2].type,
          ).id;
          const callNumberTypeLCId = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[3].type,
          ).id;
          const callNumberTypeOtherSchemeId = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[4].type,
          ).id;
          const callNumberTypeLocalId = testData.callNumberTypeLocalId;
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instances[0].instanceTypeId,
              title: instances[0].title,
            },
            holdings: [
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumberTypeId: callNumberTypeSuDocId,
                callNumber: callNumbers[1].value,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumberTypeId: callNumberTypeNLMId,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumber: callNumbers[3].value,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumberTypeId: callNumberTypeOtherSchemeId,
                callNumber: callNumbers[4].value,
              },
            ],
          }).then((instanceIds) => {
            instances[0].id = instanceIds.instanceId;
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumberTypeId: callNumberTypeDeweyId,
              itemLevelCallNumber: callNumbers[0].value,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[1].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[2].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumber: callNumbers[2].value,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[3].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumberTypeId: callNumberTypeLCId,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[4].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumberTypeId: callNumberTypeLocalId,
              itemLevelCallNumber: callNumbers[5].value,
            });
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instances[0].id);
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeLocalId);
    });

    it(
      'C396366 Browsing call number types when call number, type specified in "Holdings" or "Item" (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C396366', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0].value);
        InventorySearchAndFilter.browseSearch(callNumbers[0].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0].value);

        // InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
        //   BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        // );
        // InventorySearchAndFilter.browseSearch(callNumbers[1].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1].value);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[2].value);
        InventorySearchAndFilter.browseSearch(callNumbers[2].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].value);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[3].value);
        InventorySearchAndFilter.browseSearch(callNumbers[3].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[3].value);

        // InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
        //   BROWSE_CALL_NUMBER_OPTIONS.LOCAL,
        // );
        // InventorySearchAndFilter.browseSearch(callNumbers[5].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].value);

        // InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
        //   BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        // );
        // InventorySearchAndFilter.browseSearch(callNumbers[4].value);
        // BrowseCallNumber.checkNonExactSearchResult(callNumbers[4].value);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0].value);
        InventorySearchAndFilter.browseSearch(callNumbers[0].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0].value);

        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[1].value);
        InventorySearchAndFilter.browseSearch(callNumbers[1].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1].value);

        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[2].value);
        InventorySearchAndFilter.browseSearch(callNumbers[2].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].value);

        BrowseCallNumber.waitForCallNumberToAppear(callNumbers[3].value);
        InventorySearchAndFilter.browseSearch(callNumbers[3].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[3].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[5].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].value);
        //
        // InventorySearchAndFilter.browseSearch(callNumbers[4].value);
        // BrowseCallNumber.checkNonExactSearchResult(callNumbers[4].value);
      },
    );
  });
});
