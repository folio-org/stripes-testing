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
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = getRandomPostfix();
    const testData = {
      localCNtypeName: `AT_C405530 Local type ${randomFourDigitNumber()}`,
    };
    const instances = Array(7)
      .fill({})
      .map((_, idx) => {
        return {
          title: `AT_C405530 Instance_${idx + 1}_${rnd}`,
        };
      });
    const callNumberSettings = [
      {
        name: CALL_NUMBER_TYPE_NAMES.ALL,
        callNumberTypes: [],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, testData.localCNtypeName],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        callNumberTypes: [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        ],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.SUDOC,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
      },
    ];
    const callNumbers = [
      {
        dewey: '338.184',
        lc: 'F752.S35R68',
        nlm: 'QS 504 B739f 1984',
        sudoc: 'A93.27:229',
        other: '7374-11.1',
        local: 'Diss 378 NU 1998',
        udc: 'Folio1',
      },
      {
        dewey: '574.0723',
        lc: 'HD1761 .H36',
        nlm: 'QU 57 A6324 2008',
        sudoc: 'A93.44:AGES 90-39',
        other: 'COP.QU.2.1998-1062',
        local: 'Diss 378 NU 2003',
        udc: 'Folio2',
      },
      {
        dewey: '574.5',
        lc: 'J83.U13 1990',
        nlm: 'QZ 50 A653 1998',
        sudoc: 'NS1.37:4/7',
        other: 'COP.YZ.2.2005-173',
        local: 'Diss 378 NU 2005',
        udc: 'Folio3',
      },
      {
        dewey: '614.052',
        lc: 'PR6102.O96H43',
        nlm: 'WB115 .I56 1990',
        sudoc: 'Y1.1/8:98-461',
        other: 'MG9-B9-14',
        local: 'Diss 378 NU 2007',
        udc: 'Folio4',
      },
      {
        dewey: '616.1005',
        lc: 'PS3201.S6',
        nlm: 'WH 165 M978a 1939',
        sudoc: 'Y4.G74/7:T22/8',
        other: 'RG 1 L3L',
        local: 'Diss 378 NU 2010',
        udc: 'Folio5',
      },
      {
        dewey: '968.9707',
        lc: 'RA445.I54 1980',
        nlm: 'WT100 .G36605',
        sudoc: 'Y4.G74/7:110-65',
        other: 'RG25-A-3-c',
        local: 'Diss 378 NU 2012',
        udc: 'Folio6',
      },
      {
        dewey: '966.9053',
        lc: 'S472.S9 A37',
        nlm: 'WT 150 F829a 1977',
        sudoc: 'Y4.J89/1:118-13',
        other: 'RG3-D-3',
        local: 'Diss 378 NU 2015',
        udc: 'Folio7',
      },
    ];

    function filterCNOfType(typeToInclude) {
      const types = Array.isArray(typeToInclude) ? typeToInclude : [typeToInclude];
      return callNumbers
        .map((callNumber) => {
          return types.map((type) => callNumber[type]);
        })
        .flat();
    }

    function searchAndCheckCallNumbers(type, searchValue) {
      filterCNOfType(type).forEach((callNumber) => {
        BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        InventorySearchAndFilter.browseSearch(searchValue);
        BrowseCallNumber.checkValuePresentInResults(callNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(searchValue);
      });
    }

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C405530');
          CallNumberTypes.createCallNumberTypeViaApi({ name: testData.localCNtypeName }).then(
            (id) => {
              testData.callNumberTypeLocalId = id;
              InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
                testData.callNumberTypes = res;
              });
              callNumberSettings.forEach((setting) => {
                CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
              });
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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            instances[0].materialTypeId = res.id;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          instances[0].defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(instances[0].defaultLocation);
        })
        .then(() => {
          const callNumberTypeDeweyId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
          ).id;
          const callNumberTypeSuDocId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.SUDOC,
          ).id;
          const callNumberTypeNLMId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          ).id;
          const callNumberTypeLCId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          ).id;
          const callNumberTypeOtherSchemeId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
          ).id;
          const callNumberTypeLocalId = testData.callNumberTypeLocalId;
          const callNumberTypeFolioId = testData.callNumberTypes.find(
            (el) => el.name === CALL_NUMBER_TYPE_NAMES.UDC,
          ).id;

          for (let i = 0; i < callNumbers.length; i++) {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instances[0].instanceTypeId,
                title: instances[i].title,
              },
              holdings: [
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeDeweyId,
                  callNumber: callNumbers[i].dewey,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeLCId,
                  callNumber: callNumbers[i].lc,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeNLMId,
                  callNumber: callNumbers[i].nlm,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeSuDocId,
                  callNumber: callNumbers[i].sudoc,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeOtherSchemeId,
                  callNumber: callNumbers[i].other,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeLocalId,
                  callNumber: callNumbers[i].local,
                },
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  callNumberTypeId: callNumberTypeFolioId,
                  callNumber: callNumbers[i].udc,
                },
              ],
            }).then((createdInstanceData) => {
              instances[i].id = createdInstanceData.instanceId;
              for (let k = 0; k < callNumbers.length; k++) {
                ItemRecordNew.createViaApi({
                  holdingsId: createdInstanceData.holdingIds[k].id,
                  itemBarcode: uuid(),
                  materialTypeId: instances[0].materialTypeId,
                  permanentLoanTypeId: instances[0].loanTypeId,
                });
              }
            });
          }
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
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
      callNumberSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
      });
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeLocalId);
    });

    it(
      'C405530 Verify that call numbers of other types are not displayed in browse result list for certain call number type when user uses pagination buttons (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C405530', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        searchAndCheckCallNumbers(['dewey'], callNumbers[1].dewey);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        searchAndCheckCallNumbers(['lc'], callNumbers[1].lc);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        searchAndCheckCallNumbers(['nlm'], callNumbers[0].nlm);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        searchAndCheckCallNumbers(['other'], callNumbers[0].other);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        searchAndCheckCallNumbers(['sudoc'], callNumbers[4].sudoc);
      },
    );
  });
});
