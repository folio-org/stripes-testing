import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import CallNumberTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const permissions = [Permissions.uiInventoryViewInstances.gui];
      let callNumberTypes = null;
      const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
      const getNameById = (id) => callNumberTypes.find((type) => type.id === id)?.name;
      let folioInstancesShared = null;
      let folioInstancesMember = null;
      let currentLocation = null;
      const rndm = getRandomPostfix();
      const centralSharedItemCallNumberType = {
        payload: {
          name: `AT_C651512 Local Central ${rndm}`,
        },
      };
      const collegeItemCallNumberType = {
        payload: {
          name: `AT_C651512 Local College ${rndm}`,
        },
      };
      const generateFolioInstancesPayload = () => {
        return [
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance1 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `595.0994 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance2 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `QS 11 .GA1 E59 2005 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance3 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `SB999.A5 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance4 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `Valery P ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance5 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `L39.s:Oc1/2/991 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance6 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `VP000333 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(centralSharedItemCallNumberType.payload.name),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance7 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `ECS test 01 ${rndm}`,
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C651512 Instance8 ${rndm}`,
            itemsProperties: {
              itemLevelCallNumber: `UDC test 01 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.UDC),
            },
          }),
        ].flat();
      };

      const callNumberTypesSettings = [
        { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            centralSharedItemCallNumberType.payload.name,
          ],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          ],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
        },
      ];
      // eslint-disable-next-line func-names
      callNumberTypesSettings.getAssignedCallNumberTypes = function (name) {
        return this.find((item) => item.name === name).callNumberTypes;
      };

      const testData = {
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
        cy.resetTenant();
        cy.getAdminToken();
        removeInstancesByTitle('AT_C651512*');

        CallNumberTypesConsortiumManager.createViaApiShared(centralSharedItemCallNumberType);
        CallNumberTypesConsortiumManager.createViaApiLocal(collegeItemCallNumberType, tenants);

        callNumberTypesSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
        });

        cy.then(() => {
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.folioSourceId = folioSource.id;
          });
          InventoryInstances.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeId = loanTypes[0].id;
          });
          InventoryInstances.getMaterialTypes({ limit: 1, query: 'source=folio' }).then(
            (materialTypes) => {
              testData.materialTypeId = materialTypes[0].id;
            },
          );
          cy.withinTenant(Affiliations.College, () => {
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              testData.defaultLocation[Affiliations.College] = res;
            });
          });
        })
          .then(() => {
            CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
              callNumberTypes = types;
              folioInstancesShared = generateFolioInstancesPayload();
              cy.withinTenant(Affiliations.Consortia, () => {
                cy.log('Creating shared instances');
                InventoryInstances.createFolioInstancesViaApi({
                  folioInstances: folioInstancesShared.map((instance) => {
                    return { ...instance, holdings: [], items: [] };
                  }),
                });
              }).then(() => {
                cy.withinTenant(Affiliations.College, () => {
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
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              }).then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                InventorySearchAndFilter.switchToBrowseTab();
              });
            });
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        removeInstancesByTitle('AT_C651512*');
        cy.resetTenant();
        CallNumberTypesConsortiumManager.deleteViaApi(centralSharedItemCallNumberType);
        callNumberTypesSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
        });
        // eslint-disable-next-line no-unused-expressions
        testData?.userProperties?.userId && Users.deleteViaApi(testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        CallNumberTypesConsortiumManager.deleteViaApiLocal(collegeItemCallNumberType.id);
      });

      it(
        'C651512 Call number of each type which belong to Shared Instances could be found by call number browse from Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C651512'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          folioInstancesShared.forEach((instance) => {
            const itemCallNumberValue = instance.items[0].itemLevelCallNumber;
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            BrowseCallNumber.waitForCallNumberToAppear(itemCallNumberValue);
            InventorySearchAndFilter.browseSearch(itemCallNumberValue);
            BrowseCallNumber.valueInResultTableIsHighlighted(itemCallNumberValue);
            BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 1);
            InventorySearchAndFilter.clickResetAllButton();
          });

          [
            BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
            BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
            BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
            BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
            BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
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
                BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 1);
              } else {
                BrowseCallNumber.checkNonExactSearchResult(itemCallNumberValue);
              }
              InventorySearchAndFilter.clickResetAllButton();
            });
          });
        },
      );
    });
  });
});
