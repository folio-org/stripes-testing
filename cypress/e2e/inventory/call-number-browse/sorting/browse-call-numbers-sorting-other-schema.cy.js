import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  CALL_NUMBER_TYPES_DEFAULT,
  CallNumberTypes,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = getRandomPostfix();
    let callNumberTypes = null;
    let folioInstances = null;

    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;

    const callNumberItemProperties = [
      {
        itemLevelCallNumber: 'FIC WAL',
        volume: 'v.3',
        enumeration: 'no. 2',
        chronology: '1965',
        itemLevelCallNumberPrefix: 'AST',
        copyNumber: 'c. 2',
        itemLevelCallNumberSuffix: 'CD',
      },
      {
        itemLevelCallNumber: 'B WASHINGTON',
        volume: 'vol. 2',
        enumeration: 'n. 1',
        itemLevelCallNumberSuffix: '1999',
      },
      {
        itemLevelCallNumber: 'FIC CLE',
        enumeration: 'no.3',
        itemLevelCallNumberPrefix: 'AudCD',
        copyNumber: 'co. 1',
      },
      {
        itemLevelCallNumber: 'B JORDAN',
        volume: 'v. 04',
        chronology: '1975',
        itemLevelCallNumberSuffix: 'DVD',
      },
      { itemLevelCallNumber: 'SC BRU', enumeration: 'en. 1', copyNumber: 'copy 31' },
      { itemLevelCallNumber: 'SC VIV' },
      { itemLevelCallNumber: 'FIC DAN' },
      { itemLevelCallNumber: 'DVD F GON' },
      { itemLevelCallNumber: 'B OBAMA' },
      { itemLevelCallNumber: 'SC DAH' },
    ];

    const generateInstances = () => {
      return Array(callNumberItemProperties.length)
        .fill({})
        .map((_, i) => {
          return InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C388549 Folio Instance ${i + 1} ${rnd}`,
            itemsProperties: {
              ...callNumberItemProperties[i],
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME),
            },
          });
        })
        .flat();
    };
    let userId;
    const testData = {};

    beforeEach('create tests data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C388549');
          InventoryInstances.deleteFullInstancesWithCallNumber({
            type: 'other',
            value: 'B JORDAN DVD',
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
            callNumberTypes: [
              CALL_NUMBER_TYPES_DEFAULT.OTHER_SCHEME,
              CALL_NUMBER_TYPES_DEFAULT.UDC,
            ],
          });
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypes = res;
          });
          cy.getLocations({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.location = res;
          });
        })
        .then(() => {
          folioInstances = generateInstances();
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location: testData.location,
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    afterEach('delete test data', () => {
      cy.getAdminToken();
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        callNumberTypes: [],
      });
      Users.deleteViaApi(userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C388549');
    });

    it(
      'C388549 Browse call numbers - Correct sorting for Other scheme type call numbers (spitfire) (TaaS)',
      { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C388549', 'eurekaPhase1'] },
      () => {
        const exactMatchQuery = 'B JORDAN DVD';
        const requiredRowsOrder = [
          'B JORDAN DVD',
          'B OBAMA',
          'B WASHINGTON 1999',
          'DVD F GON',
          'AudCD FIC CLE',
          'FIC DAN',
          'AST FIC WAL CD',
          'SC BRU',
          'SC DAH',
          'SC VIV',
        ];

        InventorySearchAndFilter.switchToBrowseTab();
        callNumberItemProperties.forEach((item) => {
          const suffix = item.itemLevelCallNumberSuffix ? ` ${item.itemLevelCallNumberSuffix}` : '';
          BrowseCallNumber.waitForCallNumberToAppear(`${item.itemLevelCallNumber}${suffix}`);
        });
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        InventorySearchAndFilter.browseSearch(exactMatchQuery);
        BrowseCallNumber.valueInResultTableIsHighlighted(exactMatchQuery);
        BrowseCallNumber.resultRowsIsInRequiredOder(requiredRowsOrder);
      },
    );
  });
});
