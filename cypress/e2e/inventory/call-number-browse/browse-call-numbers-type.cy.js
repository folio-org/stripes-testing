/* eslint-disable func-names */
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      browseOptions: [
        'Dewey Decimal classification',
        'Library of Congress classification',
        'National Library of Medicine classification',
        'Other scheme',
        'Superintendent of Documents classification',
      ],
    };
    const randomLetters = getRandomLetters(7);
    let callNumberTypes = null;
    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
    const getNameById = (id) => callNumberTypes.find((type) => type.id === id)?.name;
    const rnd = getRandomPostfix();
    const localCallNumberTypeName = `AT_C414972 Local CN type ${rnd}`;
    const callNumbers = [
      { type: 'Dewey Decimal classification', value: `304 H981${randomLetters}` },
      { type: 'Library of Congress classification', value: `Z668.R360 1987${randomLetters}` },
      {
        type: 'National Library of Medicine classification',
        value: `WA 102.5 B5315 2010${randomLetters}`,
      },
      { type: 'Other scheme', value: `364.15 Slater${randomLetters}` },
      {
        type: 'Superintendent of Documents classification',
        value: `T22.19:M54/2005${randomLetters}`,
      },
      { type: 'UDC', value: `338.48${randomLetters}` },
      { value: `Local.315${randomLetters}` },
    ];
    const callNumberTypesSettings = [
      { name: 'Call numbers (all)', callNumberTypes: [] },
      {
        name: 'Dewey Decimal classification',
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: 'Library of Congress classification',
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, localCallNumberTypeName],
      },
      {
        name: 'National Library of Medicine classification',
        callNumberTypes: [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        ],
      },
      {
        name: 'Other scheme',
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
      },
      {
        name: 'Superintendent of Documents classification',
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
      },
    ];
    // eslint-disable-next-line func-names
    callNumberTypesSettings.getAssignedCallNumberTypes = function (name) {
      return this.find((item) => item.name === name).callNumberTypes;
    };
    const generateInstances = () => {
      return Array(callNumbers.length)
        .fill({})
        .map((_, i) => {
          return InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C414972 Folio Instance ${i + 1} ${rnd}`,
            itemsProperties: {
              itemLevelCallNumber: callNumbers[i].value,
              itemLevelCallNumberTypeId: callNumbers[i]?.type && getIdByName(callNumbers[i]?.type),
            },
          });
        })
        .flat();
    };

    let folioInstances = null;
    let marcInstances = null;
    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C414972');
          CallNumberTypes.deleteCallNumberTypesLike('AT_C414972').then(() => {
            CallNumberTypes.createCallNumberTypeViaApi({
              name: localCallNumberTypeName,
            }).then(() => {
              callNumberTypesSettings.forEach((setting) => {
                CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
              });
              CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                callNumberTypes = res;
              });
            });
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          testData.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(testData.defaultLocation);
        })
        .then(() => {
          folioInstances = generateInstances();
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location: testData.defaultLocation,
          });
        })
        .then(() => {
          marcInstances = generateInstances().map((_, i) => {
            return { ..._, instanceTitle: `AT_C414972 Marc Instance ${i + 1} ${rnd}` };
          });
          InventoryInstances.createMarcInstancesViaApi({
            marcInstances,
            location: testData.defaultLocation,
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.waitForAuthRefresh(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C414972');
      callNumberTypesSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
      });
      CallNumberTypes.deleteCallNumberTypesLike('AT_C414972');
    });

    it(
      'C414972 Browsing call number types when "Number of titles" > 1 (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C414972', 'eurekaPhase1'] },
      () => {
        const callNumber = folioInstances[1].items[0].itemLevelCallNumber;
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup('Call numbers (all)');
        callNumbers.forEach((cn) => {
          BrowseCallNumber.waitForCallNumberToAppear(cn.value);
        });
        InventorySearchAndFilter.browseSearch(callNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber }],
        });
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '2');
        BrowseCallNumber.clickOnResult(callNumber);
        InventorySearchAndFilter.verifyInstanceDisplayed(folioInstances[1].instanceTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(marcInstances[1].instanceTitle);
        InventorySearchAndFilter.verifyNumberOfSearchResults(2);

        testData.browseOptions.forEach((browseOption) => {
          folioInstances.forEach((instance, idx) => {
            const itemCallNumberType = getNameById(instance.items[0].itemLevelCallNumberTypeId);
            const itemCallNumberValue = instance.items[0].itemLevelCallNumber;

            if (
              itemCallNumberType &&
              callNumberTypesSettings
                .getAssignedCallNumberTypes(browseOption)
                .includes(itemCallNumberType)
            ) {
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
              InventorySearchAndFilter.browseSearch(itemCallNumberValue);
              InventorySearchAndFilter.verifyBrowseInventorySearchResults({
                records: [{ callNumber: itemCallNumberValue }],
              });
              BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, '2');
              BrowseCallNumber.clickOnResult(itemCallNumberValue);
              InventorySearchAndFilter.verifyInstanceDisplayed(folioInstances[idx].instanceTitle);
              InventorySearchAndFilter.verifyInstanceDisplayed(marcInstances[idx].instanceTitle);
              InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            }
          });
        });
      },
    );
  });
});
