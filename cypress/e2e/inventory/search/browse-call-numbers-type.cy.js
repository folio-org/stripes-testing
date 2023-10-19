import uuid from 'uuid';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const instance = {
      title: `C414972_autotest_instance ${getRandomPostfix()}`,
    };
    const callNumbers = [
      { type: 'Dewey Decimal classification', value: '348.12' },
      { type: 'National Library of Medicine classification', value: 'QS 55 .GA8 Q9 2023' },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            instance.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            instance.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            instance.loanTypeId = res[0].id;
            instance.loanTypeName = res[0].name;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            instance.materialTypeId = res.id;
          });
          InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
            testData.callNumberTypes = res;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(instance.defaultLocation);
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
              instanceTypeId: instance.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
                callNumberTypeId: callNumberTypeId1,
                callNumber: callNumbers[0].value,
              },
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
              },
            ],
          }).then((instanceIds) => {
            instance.id = instanceIds.instanceId;
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: instance.materialTypeId,
              permanentLoanTypeId: instance.loanTypeId,
            });
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[1].id,
              itemBarcode: uuid(),
              materialTypeId: instance.materialTypeId,
              permanentLoanTypeId: instance.loanTypeId,
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
    });

    it(
      'C414972 Browsing call number types when "Number of titles" > 1 (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        InventoryInstance.searchByTitle(instance.id);
      },
    );
  });
});
