import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import CallNumberTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import { Locations } from '../../../../support/fragments/settings/tenant/location-setup';
import { CALL_NUMBER_TYPE_NAMES } from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const permissions = [Permissions.uiInventoryViewInstances.gui];
    const randomDigits = randomFourDigitNumber();
    const callNumberPostfix = `651515${randomDigits}${randomDigits}`;
    let callNumberTypes = null;
    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
    const getNameById = (id) => callNumberTypes.find((type) => type.id === id)?.name;
    let folioInstancesShared = null;
    let folioInstancesMember = null;
    let currentLocation = null;
    const rndm = getRandomPostfix();
    const centralSharedItemCallNumberType = {
      payload: {
        name: `AT_C651515 Local Central ${rndm}`,
      },
    };
    const collegeItemCallNumberType = {
      payload: {
        name: `AT_C651515 Local College ${rndm}`,
      },
    };
    const generateFolioInstancesPayload = () => {
      return [
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance1 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `595.0994 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance2 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `QS 11 .GA1 E59 2005 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance3 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `SB999.A5 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance4 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `Valery P ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance5 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `L39.s:Oc1/2/991 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance6 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `VP000333 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(centralSharedItemCallNumberType.payload.name),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance7 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `ECS test 01 ${callNumberPostfix}`,
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance8 ${rndm}`,
          itemsProperties: {
            itemLevelCallNumber: `UDC test 01 ${callNumberPostfix}`,
            itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.UDC),
          },
        }),
      ].flat();
    };

    const callNumberTypesSettings = [
      { name: 'Call numbers (all)', callNumberTypes: [] },
      {
        name: 'Dewey Decimal classification',
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: 'Library of Congress classification',
        callNumberTypes: [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          centralSharedItemCallNumberType.payload.name,
        ],
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

    const testData = {
      servicePoint: ServicePoints.getDefaultServicePoint(),
      defaultLocation: {},
    };
    const tenants = [Affiliations.College];
    const removeInstancesByTitle = (title) => {
      [Affiliations.College, Affiliations.Consortia].forEach((tenant) => {
        cy.withinTenant(tenant, () => {
          InventoryInstances.deleteFullInstancesByTitleViaApi(title);
        });
      });
    };

    before('Create user, data', () => {
      cy.getAdminToken();
      removeInstancesByTitle('AT_C651515*');

      CallNumberTypesConsortiumManager.createViaApiShared(centralSharedItemCallNumberType);
      CallNumberTypesConsortiumManager.createViaApiLocal(collegeItemCallNumberType, tenants);

      callNumberTypesSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
      });

      cy.then(() => {
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.folioSourceId = folioSource.id;
        });
        [Affiliations.College, Affiliations.Consortia].forEach((tenant) => {
          cy.withinTenant(tenant, () => {
            ServicePoints.getViaApi({ query: 'name=Circ Desk' }).then((servicePoints) => {
              testData.defaultLocation[tenant] = Location.getDefaultLocation(servicePoints[0].id);
              Location.createViaApi(testData.defaultLocation[tenant]);
            });
          });
        });
      })
        .then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
            callNumberTypes = types;
            folioInstancesShared = generateFolioInstancesPayload();
            cy.withinTenant(Affiliations.Consortia, () => {
              cy.log('Creating shared instances');
              currentLocation = testData.defaultLocation[Affiliations.Consortia];
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: folioInstancesShared.map((instance) => {
                  return { ...instance, holdings: [], items: [] };
                }),
                location: currentLocation,
              });
            }).then(() => {
              cy.withinTenant(Affiliations.College, () => {
                InventoryInstances.getLoanTypes().then((loanTypes) => {
                  testData.loanTypeId = loanTypes[0].id;
                });
                InventoryInstances.getMaterialTypes().then((materialTypes) => {
                  testData.materialTypeId = materialTypes[0].id;
                });
                cy.log('Creating holdings and items for shared instances');
                currentLocation = testData.defaultLocation[Affiliations.College];
                folioInstancesShared.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    ...instance.holdings[0],
                    instanceId: instance.instanceId,
                    permanentLocationId: currentLocation.id,
                    sourceId: testData.folioSourceId,
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      ...instance.items[0],
                      holdingsRecordId: holding.id,
                      materialType: { id: testData.materialTypeId },
                      permanentLoanType: { id: testData.loanTypeId },
                    });
                  });
                });
              });
            });
          });
        })
        .then(() => {
          cy.withinTenant(Affiliations.College, () => {
            folioInstancesMember = generateFolioInstancesPayload();
            cy.log('Creating member instances');
            currentLocation = testData.defaultLocation[Affiliations.College];
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: folioInstancesMember,
              location: currentLocation,
            });
          });
        });

      cy.withinTenant(Affiliations.Consortia, () => {
        cy.createTempUser(permissions)
          .then((userProperties) => {
            testData.userProperties = userProperties;
            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: testData.userProperties.userId,
              permissions,
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 30_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventorySearchAndFilter.switchToBrowseTab();
          });
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      removeInstancesByTitle('AT_C651515*');
      CallNumberTypesConsortiumManager.deleteViaApi(centralSharedItemCallNumberType, false);
      CallNumberTypesConsortiumManager.deleteViaApiLocal(collegeItemCallNumberType.id, false);
      callNumberTypesSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
      });
      // eslint-disable-next-line no-unused-expressions
      testData?.userProperties?.userId && Users.deleteViaApi(testData.userProperties.userId);
      [Affiliations.College, Affiliations.Consortia].forEach((tenant) => {
        cy.withinTenant(tenant, () => {
          Locations.deleteViaApi(testData.defaultLocation[tenant]);
        });
      });
    });

    it(
      'C651515 Call number of each type which belong to Shared and Local Instances could be found by call number browse from Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C651515'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        folioInstancesShared.forEach((instance) => {
          const itemCallNumberValue = instance.items[0].itemLevelCallNumber;
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup('Call numbers (all)');
          InventorySearchAndFilter.browseSearch(itemCallNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(itemCallNumberValue);
          BrowseCallNumber.checkNumberOfTitlesForRow(
            itemCallNumberValue,
            2, // 2 titles for each call number include "Shared" and "Local" instances
          );
          InventorySearchAndFilter.clickResetAllButton();
        });

        [
          'Dewey Decimal classification',
          'Library of Congress classification',
          'National Library of Medicine classification',
          'Other scheme',
          'Superintendent of Documents classification',
        ].forEach((browseOption) => {
          folioInstancesShared.forEach((instance) => {
            const itemCallNumberType = getNameById(instance.items[0].itemLevelCallNumberTypeId);
            const itemCallNumberValue = instance.items[0].itemLevelCallNumber;
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
            cy.wait(500);
            InventorySearchAndFilter.browseSearch(itemCallNumberValue);

            if (
              itemCallNumberType &&
              callNumberTypesSettings
                .getAssignedCallNumberTypes(browseOption)
                .includes(itemCallNumberType)
            ) {
              BrowseCallNumber.valueInResultTableIsHighlighted(itemCallNumberValue);
              BrowseCallNumber.checkNumberOfTitlesForRow(
                itemCallNumberValue,
                2, // 2 titles for each call number include "Shared" and "Local" instances
              );
              BrowseCallNumber.SharedAccordion.byShared('Yes');
              BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 1); // 1 title for call number include "Shared" instance

              BrowseCallNumber.SharedAccordion.reset();
              BrowseCallNumber.SharedAccordion.byShared('No');
              cy.wait(2_000); // wait for the result table to be updated
              BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 1); // 1 title for call number include "Local" instance
            } else {
              BrowseCallNumber.checkNonExactSearchResult(`${itemCallNumberValue}`);
            }
            InventorySearchAndFilter.clickResetAllButton();
          });
        });
      },
    );
  });
});
