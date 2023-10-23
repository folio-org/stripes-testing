import uuid from 'uuid';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const instances = [
      {
        title: `C414972_autotest_instance_1_${getRandomPostfix()}`,
      },
      {
        title: `C414972_autotest_instance_2_${getRandomPostfix()}`,
      },
    ];
    const callNumbers = [
      { type: 'Dewey Decimal classification', value: '414.972' },
      { type: 'National Library of Medicine classification', value: 'QS 41 .GC4 Q9 2077' },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
          const callNumberTypeId1 = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[0].type,
          ).id;
          const callNumberTypeId2 = testData.callNumberTypes.find(
            (el) => el.name === callNumbers[1].type,
          ).id;
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instances[0].instanceTypeId,
              title: instances[0].title,
            },
            holdings: [
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumberTypeId: callNumberTypeId1,
                callNumber: callNumbers[0].value,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
              },
            ],
          }).then((instanceIds) => {
            instances[0].id = instanceIds.instanceId;
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[1].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumberTypeId: callNumberTypeId2,
              itemLevelCallNumber: callNumbers[1].value,
            });
          });
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instances[0].instanceTypeId,
              title: instances[1].title,
            },
            holdings: [
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
                callNumberTypeId: callNumberTypeId1,
                callNumber: callNumbers[0].value,
              },
              {
                holdingsTypeId: instances[0].holdingTypeId,
                permanentLocationId: instances[0].defaultLocation.id,
              },
            ],
          }).then((instanceIds) => {
            instances[1].id = instanceIds.instanceId;
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[1].id,
              itemBarcode: uuid(),
              materialTypeId: instances[0].materialTypeId,
              permanentLoanTypeId: instances[0].loanTypeId,
              itemLevelCallNumberTypeId: callNumberTypeId2,
              itemLevelCallNumber: callNumbers[1].value,
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
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instances[0].id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instances[1].id);
    });

    it(
      'C414972 Browsing call number types when "Number of titles" > 1 (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(callNumbers[0].type);
        InventorySearchAndFilter.browseSearch(callNumbers[0].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0].value);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumbers[0].value, '2');
        BrowseCallNumber.clickOnResult(callNumbers[0].value);
        InventorySearchAndFilter.verifyInstanceDisplayed(instances[0].title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instances[1].title);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(callNumbers[1].type);
        InventorySearchAndFilter.browseSearch(callNumbers[1].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1].value);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumbers[1].value, '2');
        BrowseCallNumber.clickOnResult(callNumbers[1].value);
        InventorySearchAndFilter.verifyInstanceDisplayed(instances[0].title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instances[1].title);
      },
    );
  });
});
