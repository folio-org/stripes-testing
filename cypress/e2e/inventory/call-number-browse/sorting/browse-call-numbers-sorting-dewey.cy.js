import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = getRandomPostfix();
    let callNumberTypes = null;
    let folioInstances = null;

    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;

    const callNumberItemProperties = [
      { itemLevelCallNumber: '331.2', volume: 'v.1', enumeration: 'n1', chronology: '2001' },
      {
        itemLevelCallNumber: '331.042',
        volume: 'v.3',
        enumeration: 'no. 5',
        chronology: '1888',
        itemLevelCallNumberPrefix: 'ASTM',
        copyNumber: 'c. 1',
        itemLevelCallNumberSuffix: 'CD',
      },
      {
        itemLevelCallNumber: '331.01',
        volume: 'v. 2',
        enumeration: 'no. 3',
        chronology: '1995',
        copyNumber: 'c. 2',
        itemLevelCallNumberSuffix: 'AudCD',
      },
      {
        itemLevelCallNumber: '331.016',
        enumeration: 'n.3',
        chronology: '1900-2000',
        itemLevelCallNumberPrefix: 'Over',
        copyNumber: 'copy 2',
      },
      {
        itemLevelCallNumber: '331.1',
        volume: 'vol. 15',
        itemLevelCallNumberPrefix: 'win',
        copyNumber: 'c. 3',
        itemLevelCallNumberSuffix: '2010',
      },
      { itemLevelCallNumber: '331' },
      { itemLevelCallNumber: '331.041' },
      { itemLevelCallNumber: '331.198' },
      { itemLevelCallNumber: '331.0413' },
      { itemLevelCallNumber: '331.02' },
    ];

    const generateInstances = () => {
      return Array(callNumberItemProperties.length)
        .fill({})
        .map((_, i) => {
          return InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C388548 Folio Instance ${i + 1} ${rnd}`,
            itemsProperties: {
              ...callNumberItemProperties[i],
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
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
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C388548');
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypes = res;
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
      Users.deleteViaApi(userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C388548');
      Location.deleteViaApi(testData.defaultLocation.id);
    });

    it(
      'C388548 Browse call numbers - Correct sorting for Dewey type call numbers (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C388548'] },
      () => {
        const exactMatchQuery = '331';
        const nonExactMatchQuery = '330.999999';
        const requiredRowsOrder = [
          '331',
          '331.01 AudCD',
          'Over 331.016',
          '331.02',
          '331.041',
          '331.0413',
          'ASTM 331.042 CD',
          'win 331.1 2010',
          '331.198',
          '331.2',
        ];
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        callNumberItemProperties
          .map(
            (data) => `${data.itemLevelCallNumber}${data.itemLevelCallNumberSuffix ? ' ' + data.itemLevelCallNumberSuffix : ''}`,
          )
          .forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });

        InventorySearchAndFilter.browseSearch(exactMatchQuery);
        BrowseCallNumber.valueInResultTableIsHighlighted(exactMatchQuery);
        BrowseCallNumber.resultRowsIsInRequiredOder(requiredRowsOrder);

        InventorySearchAndFilter.browseSearch(nonExactMatchQuery);
        InventorySearchAndFilter.verifySearchResult(`${nonExactMatchQuery}would be here`);
        BrowseCallNumber.resultRowsIsInRequiredOder(requiredRowsOrder);
      },
    );
  });
});
