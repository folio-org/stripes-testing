import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const instance = {
      title: `AT_C387477 Instance ${getRandomPostfix()}`,
    };
    const localCallNumberTypeName = 'AT_C387477 Local CN type';
    const callNumberTypesSettings = { name: 'Call numbers (all)', callNumberTypes: [] };
    const callNumbers = [
      { type: 'Library of Congress classification', value: 'Z668.R360 1987' },
      { type: 'Dewey Decimal classification', value: '304 H981' },
      { type: 'Superintendent of Documents classification', value: 'T22.19:M54/test-2/2005' },
      { type: 'National Library of Medicine classification', value: 'WA 102.5 B5315 2018' },
      { type: 'Other scheme', value: '364.15 Slater' },
      { type: localCallNumberTypeName, value: 'MyNr123465' },
      { type: 'UDC', value: '338.48' },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          CallNumberTypes.deleteCallNumberTypesLike('C387477');
          CallNumberTypes.createCallNumberTypeViaApi({
            name: localCallNumberTypeName,
          }).then((id) => {
            testData.callNumberTypeId = id;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi(callNumberTypesSettings);
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
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instance.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
              },
            ],
          }).then((instanceIds) => {
            instance.id = instanceIds.instanceId;
            callNumbers.forEach((callNumber) => {
              const callNumberTypeId = testData.callNumberTypes.find(
                (el) => el.name === callNumber.type,
              ).id;
              return ItemRecordNew.createViaApi({
                holdingsId: instanceIds.holdingIds[0].id,
                itemBarcode: uuid(),
                materialTypeId: instance.materialTypeId,
                permanentLoanTypeId: instance.loanTypeId,
                itemLevelCallNumberTypeId: callNumberTypeId,
                itemLevelCallNumber: callNumber.value,
              });
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
      InventoryInstances.deleteFullInstancesByTitleViaApi('C387477');
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeId);
    });

    it(
      'C387477 Browsing call number types when "Call numbers (all)" browse option selected (based on "Item") (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C387477', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.browseOptionsDropdownIncludesOptions(
          Object.values(BROWSE_CALL_NUMBER_OPTIONS),
        );
        InventorySearchAndFilter.selectBrowseCallNumbers();
        callNumbers.forEach((el) => {
          InventorySearchAndFilter.browseSearch(el.value);
          BrowseCallNumber.valueInResultTableIsHighlighted(el.value);
        });
      },
    );
  });
});
