import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = randomFourDigitNumber();
    let callNumberTypes = null;
    let folioInstances = null;
    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;

    const testData = {};

    const callNumberTypesSettings = [
      {
        name: CALL_NUMBER_TYPE_NAMES.ALL,
        callNumberTypes: [],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.SUDOC,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
      },
    ];

    const instancesPayload = () => {
      return [
        {
          instanceTitlePrefix: `AT_C451468 Instance 1 ${rnd}`,
          holdings: [
            {
              callNumber: '331.3',
              callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
            },
          ],
          itemsProperties: {
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
          },
        },
        {
          instanceTitlePrefix: `AT_C451468 Instance 2 ${rnd}`,
          holdings: [{ callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS) }],
          itemsProperties: {
            itemLevelCallNumber: '331.4',
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
          },
        },
        {
          instanceTitlePrefix: `AT_C451466 Instance 1 ${rnd}`,
          holdings: [
            {
              callNumber: `A 123.4.${rnd}`,
              callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
            },
          ],
          itemsProperties: {
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
          },
        },
        {
          instanceTitlePrefix: `AT_C451466 Instance 2 ${rnd}`,
          holdings: [{ callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL) }],
          itemsProperties: {
            itemLevelCallNumber: `A 123.5.${rnd}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
          },
        },
        {
          instanceTitlePrefix: `AT_C451469 Instance 1 ${rnd}`,
          holdings: [
            {
              callNumber: `T22.19/2:P96.${rnd}`,
              callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
            },
          ],
          itemsProperties: {
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
          },
        },
        {
          instanceTitlePrefix: `AT_C451469 Instance 2 ${rnd}`,
          holdings: [{ callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE) }],
          itemsProperties: {
            itemLevelCallNumber: `T22.19/2:P97.${rnd}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
          },
        },
        {
          instanceTitlePrefix: `AT_C451470 Instance 1 ${rnd}`,
          holdings: [
            {
              callNumber: `QS 11 .GA1 E53 2024.${rnd}`,
              callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
            },
          ],
          itemsProperties: {
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
          },
        },
        {
          instanceTitlePrefix: `AT_C451470 Instance 2 ${rnd}`,
          holdings: [{ callNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC) }],
          itemsProperties: {
            itemLevelCallNumber: `QS 11 .GA1 E53 2025.${rnd}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
          },
        },
      ];
    };
    const generateInstances = () => {
      return instancesPayload()
        .map((_) => {
          return InventoryInstances.generateFolioInstances(_);
        })
        .flat();
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          ['AT_C451466', 'AT_C451468', 'AT_C451469', 'C451470'].forEach((title) => {
            InventoryInstances.deleteFullInstancesByTitleViaApi(title);
          });

          testData.userServicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypes = res;
          });
          callNumberTypesSettings.forEach((setting) => {
            CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
          });
        })
        .then(() => {
          folioInstances = generateInstances();
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location: testData.defaultLocation,
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

    after('Delete test data', () => {
      cy.getAdminToken();
      ['AT_C451466', 'AT_C451468', 'AT_C451469', 'AT_C451470'].forEach((title) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(title);
      });
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C451466 C451468 C451469 C451470 Call number of not valid format and with selected call number type can be found via browse (spitfire)',
      {
        tags: [
          'criticalPathFlaky',
          'spitfire',
          'nonParallel',
          'C451468',
          'C451466',
          'C451469',
          'C451470',
        ],
      },
      () => {
        folioInstances.forEach((instance) => {
          const callNumberQuery =
            instance.holdings[0].callNumber || instance.items[0].itemLevelCallNumber;
          InventorySearchAndFilter.selectBrowseCallNumbers();
          BrowseCallNumber.waitForCallNumberToAppear(callNumberQuery);
          InventorySearchAndFilter.browseSearch(callNumberQuery);
          InventorySearchAndFilter.verifyBrowseInventorySearchResults({
            records: [{ callNumber: callNumberQuery }],
          });
          InventorySearchAndFilter.clickResetAllButton();
        });

        [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          CALL_NUMBER_TYPE_NAMES.SUDOC,
        ].forEach((callNumberType) => {
          folioInstances.forEach((instance) => {
            const callNumberQuery =
              instance.holdings[0].callNumber || instance.items[0].itemLevelCallNumber;
            const currentCallNumberType = getIdByName(callNumberType);
            const holdingsCallNumberType = instance.holdings[0]?.callNumberTypeId;
            const itemsCallNumberType = instance.items[0]?.itemLevelCallNumberTypeId;
            if (
              holdingsCallNumberType !== currentCallNumberType ||
              itemsCallNumberType !== currentCallNumberType
            ) {
              return;
            }
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(callNumberType);
            BrowseCallNumber.waitForCallNumberToAppear(callNumberQuery);
            InventorySearchAndFilter.browseSearch(callNumberQuery);
            InventorySearchAndFilter.verifyBrowseInventorySearchResults({
              records: [{ callNumber: callNumberQuery }],
            });
            InventorySearchAndFilter.clickResetAllButton();
          });
        });
      },
    );
  });
});
