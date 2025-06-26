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
        dewey: '338.530',
        lc: 'F405.S35R53',
        nlm: 'QS 504 B530f 1984',
        sudoc: 'A93.27:530',
        other: '7405-53.1',
        local: 'Diss 405 NU 1998',
        udc: 'Folio45531',
      },
      {
        dewey: '574.0405',
        lc: 'HD1405 .H36',
        nlm: 'QU 57 A6405 2008',
        sudoc: 'A93.40:AGES 55-30',
        other: 'COP.QU.5.1989-2023',
        local: 'Diss 530 NU 2003',
        udc: 'Folio45532',
      },
      {
        dewey: '530.4',
        lc: 'J40.U53 1998',
        nlm: 'QZ 52 A530 1998',
        sudoc: 'NS1.45:5/3',
        other: 'COP.YZ.4.2005-405',
        local: 'Diss 389 NU 1989',
        udc: 'Folio45533',
      },
      {
        dewey: '614.405',
        lc: 'PR6405.O96H43',
        nlm: 'WB405 .I50 1990',
        sudoc: 'Y1.4/5:98-530',
        other: 'MG4-B0-55',
        local: 'Diss 550 NU 2003',
        udc: 'Folio45534',
      },
      {
        dewey: '616.1530',
        lc: 'PS3530.S6',
        nlm: 'WH 165 M530a 1939',
        sudoc: 'Y4.G45/7:T53/0',
        other: 'RG 4 L5L',
        local: 'Diss 455 NU 2018',
        udc: 'Folio45535',
      },
      {
        dewey: '968.9530',
        lc: 'RA405.I54 1987',
        nlm: 'WT108 .G36530',
        sudoc: 'Y4.G78/2:405-53',
        other: 'RG40-A-5-c',
        local: 'Diss 453 NU 2022',
        udc: 'Folio45536',
      },
      {
        dewey: '966.9405',
        lc: 'S405.S9 A37',
        nlm: 'WT 405 F829a 1977',
        sudoc: 'Y4.J40/5:530-13',
        other: 'RG4-D-5',
        local: 'Diss 553 NU 2001',
        udc: 'Folio45537',
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
      InventorySearchAndFilter.browseSearch(searchValue);
      BrowseCallNumber.valueInResultTableIsHighlighted(searchValue);
      filterCNOfType(type).forEach((callNumber) => {
        BrowseCallNumber.waitForCallNumberToAppear(callNumber);
      });
      filterCNOfType(type).forEach((callNumber) => {
        BrowseCallNumber.checkValuePresentInResults(callNumber);
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
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        cy.waitForAuthRefresh(() => {
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
        searchAndCheckCallNumbers(['local'], callNumbers[1].local);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        searchAndCheckCallNumbers(['nlm'], callNumbers[0].nlm);
        searchAndCheckCallNumbers(['lc'], callNumbers[0].lc);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        searchAndCheckCallNumbers(['other'], callNumbers[0].other);
        searchAndCheckCallNumbers(['udc'], callNumbers[0].udc);

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        searchAndCheckCallNumbers(['sudoc'], callNumbers[4].sudoc);
      },
    );
  });
});
