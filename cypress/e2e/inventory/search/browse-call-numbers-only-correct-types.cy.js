import uuid from 'uuid';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      localCNtypeName: `C405530 Local type ${randomFourDigitNumber()}`,
    };
    const instances = [
      {
        title: `C405530_autotest_instance_1_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_2_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_3_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_4_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_5_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_6_${getRandomPostfix()}`,
      },
      {
        title: `C405530_autotest_instance_7_${getRandomPostfix()}`,
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
        folio: 'Folio45531',
      },
      {
        dewey: '574.0405',
        lc: 'HD1405 .H36',
        nlm: 'QU 57 A6405 2008',
        sudoc: 'A93.40:AGES 55-30',
        other: 'COP.QU.5.1989-2023',
        local: 'Diss 530 NU 2003',
        folio: 'Folio45532',
      },
      {
        dewey: '530.4',
        lc: 'J40.U53 1998',
        nlm: 'QZ 52 A530 1998',
        sudoc: 'NS1.45:5/3',
        other: 'COP.YZ.4.2005-405',
        local: 'Diss 389 NU 1989',
        folio: 'Folio45533',
      },
      {
        dewey: '614.405',
        lc: 'PR6405.O96H43',
        nlm: 'WB405 .I50 1990',
        sudoc: 'Y1.4/5:98-530',
        other: 'MG4-B0-55',
        local: 'Diss 550 NU 2003',
        folio: 'Folio45534',
      },
      {
        dewey: '616.1530',
        lc: 'PS3530.S6',
        nlm: 'WH 165 M530a 1939',
        sudoc: 'Y4.G45/7:T53/0',
        other: 'RG 4 L5L',
        local: 'Diss 455 NU 2018',
        folio: 'Folio45535',
      },
      {
        dewey: '968.9530',
        lc: 'RA405.I54 1987',
        nlm: 'WT108 .G36530',
        sudoc: 'Y4.G78/2:405-53',
        other: 'RG40-A-5-c',
        local: 'Diss 453 NU 2022',
        folio: 'Folio45536',
      },
      {
        dewey: '966.9405',
        lc: 'S405.S9 A37',
        nlm: 'WT 405 F829a 1977',
        sudoc: 'Y4.J40/5:530-13',
        other: 'RG4-D-5',
        local: 'Diss 553 NU 2001',
        folio: 'Folio45537',
      },
    ];

    function filterCNsExcluding(typeToExclude, titleIndex) {
      return Object.keys(callNumbers[titleIndex])
        .filter((key) => key !== typeToExclude)
        .reduce((obj, key) => {
          obj[key] = callNumbers[titleIndex][key];
          return Object.values(obj);
        }, {});
    }

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.createLocalCallNumberTypeViaApi(testData.localCNtypeName).then(
            (id) => {
              testData.callNumberTypeLocalId = id;
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
          InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
            testData.callNumberTypes = res;
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
          const callNumberTypeFolioId = testData.callNumberTypes.filter(
            (el) => el.source === 'folio',
          )[0].id;

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
                  callNumber: callNumbers[i].folio,
                },
              ],
            }).then((instanceIds) => {
              instances[i].id = instanceIds.instanceId;
              for (let k = 0; k < callNumbers.length; k++) {
                ItemRecordNew.createViaApi({
                  holdingsId: instanceIds.holdingIds[k].id,
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
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
      InventoryInstances.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeLocalId);
    });

    it(
      'C405530 Verify that call numbers of other types are not displayed in browse result list for certain call number type when user uses pagination buttons (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL);
        InventorySearchAndFilter.browseSearch(callNumbers[5].dewey);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].dewey);
        BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('dewey', 5));

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS);
        InventorySearchAndFilter.browseSearch(callNumbers[6].lc);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[6].lc);
        BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('lc', 6));

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LOCAL);
        InventorySearchAndFilter.browseSearch(callNumbers[6].local);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[6].local);
        BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('local', 6));

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE);
        InventorySearchAndFilter.browseSearch(callNumbers[2].nlm);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].nlm);
        BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('nlm', 2));

        InventorySearchAndFilter.selectBrowseOption(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        InventorySearchAndFilter.browseSearch(callNumbers[4].sudoc);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[4].sudoc);
        BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('sudoc', 4));
      },
    );
  });
});
