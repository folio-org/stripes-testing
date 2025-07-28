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

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const instance = {
      title: `C387477_autotest_instance ${getRandomPostfix()}`,
    };
    const callNumbers = [
      { type: 'Library of Congress classification', value: 'Z668.R360 1987' },
      { type: 'Dewey Decimal classification', value: '304 H981' },
      { type: 'Superintendent of Documents classification', value: 'T22.19:M54/test-2/2005' },
      { type: 'National Library of Medicine classification', value: 'WA 102.5 B5315 2018' },
      { type: 'Other scheme', value: '364.15 Slater' },
      { type: 'My Local CN type', value: 'MyNr123465' },
      { type: 'UDC', value: '338.48' },
    ];

    before('Create test data', () => {
      /*
       * System must have "Instance" record(s) with added "Holdings"
       * "Holdings" must not have any call numbers specified
       * "Holdings" must contain "Item" records with following call number types specified (types are selected in "Call number type" dropdown):
       * Library of Congress classification (e.g., "Z668.R360 1987")
       * Dewey Decimal classification (e.g., "304 H981")
       * Superintendent of Documents classification (e.g., "T22.19:M54/test-2/2005")
       * National Library of Medicine classification (e.g., "WA 102.5 B5315 2018")
       * Other scheme (e.g., "364.15 Slater")
       * Any Local call number type (e.g., "My Local CN type" type: "MyNr123465")
       * Any other call number type (e.g., "UDC" type: "338.48")
       */
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.createLocalCallNumberTypeViaApi('My Local CN type').then((id) => {
            testData.callNumberTypeId = id;
          });
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      InventoryInstances.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeId);
    });

    it(
      'C387477 Browsing call number types when "Call numbers (all)" browse option selected (based on "Item") (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C387477'] },
      () => {
        // #1 Click on browse option dropdown (with default value "Select a browse option")
        // * Dropdown is expanded and includes following browse options:
        //  * Call numbers (all)
        //  * Dewey Decimal classification
        //  * Library of Congress classification
        //  * Local
        //  * National Library of Medicine classification
        //  * Other scheme
        //  * Superintendent of Documents classification
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.browseOptionsDropdownIncludesOptions(
          Object.values(BROWSE_CALL_NUMBER_OPTIONS),
        );
        // #2 * Select "Call numbers (all)" browse option
        InventorySearchAndFilter.selectBrowseCallNumbers();
        // #2 - 8 * Fill browse input field with call number from pre-conditions (e.g., "304 H981")
        // * Click "Search" button
        // * Browse results are shown in second pane:
        //  * a row with "Call number" value corresponding to a browse query is highlighted (bold text)
        callNumbers.forEach((el) => {
          BrowseCallNumber.waitForCallNumberToAppear(el.value);
          InventorySearchAndFilter.browseSearch(el.value);
          BrowseCallNumber.valueInResultTableIsHighlighted(el.value);
        });
      },
    );
  });
});
