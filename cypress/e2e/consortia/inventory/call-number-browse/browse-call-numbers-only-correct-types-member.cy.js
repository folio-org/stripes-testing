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
import { including } from '../../../../../interactors';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const permissions = [Permissions.inventoryAll.gui];
      const heldbyAccordionName = 'Held by';
      let callNumberTypes = null;
      const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
      const getNameById = (id) => callNumberTypes.find((type) => type.id === id)?.name;
      let folioInstancesShared = null;
      let folioInstancesShared2 = null;
      let currentLocation = null;
      const rndm = getRandomPostfix();
      const centralSharedItemCallNumberType = {
        payload: {
          name: `AT_C656321 Local Central ${rndm}`,
        },
      };
      const generateFolioInstancesPayload = () => {
        return [
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance1 `,
            itemsProperties: {
              itemLevelCallNumber: `656.3216 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance2 `,
            itemsProperties: {
              itemLevelCallNumber: `QS 65 .GA6 E32 1656 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance3 `,
            itemsProperties: {
              itemLevelCallNumber: `SB656.A3 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance4 `,
            itemsProperties: {
              itemLevelCallNumber: `Sixfivesixthreetwoone P ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance5 `,
            itemsProperties: {
              itemLevelCallNumber: `L65.s:Oc6/3/216 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.SUDOC),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance6 `,
            itemsProperties: {
              itemLevelCallNumber: `VP656321 ${rndm}`,
              itemLevelCallNumberTypeId: getIdByName(centralSharedItemCallNumberType.payload.name),
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance7 `,
            itemsProperties: {
              itemLevelCallNumber: `ECS test 656321 ${rndm}`,
            },
          }),
          InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C656321 ${rndm} Instance8 `,
            itemsProperties: {
              itemLevelCallNumber: `UDC test 656321 ${rndm}`,
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
        defaultLocations: {},
        loanTypeIds: {},
        materialTypeIds: {},
        folioSourceIds: {},
      };
      const removeInstancesByTitle = (title) => {
        [Affiliations.College, Affiliations.University, Affiliations.Consortia].forEach(
          (tenant) => {
            cy.withinTenant(tenant, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi(title);
            });
          },
        );
      };

      before('Create user, data', () => {
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          removeInstancesByTitle('AT_C656321*');

          cy.resetTenant();
          CallNumberTypesConsortiumManager.createViaApiShared(centralSharedItemCallNumberType);
        })
          .then(() => {
            [Affiliations.College, Affiliations.University].forEach((tenant) => {
              cy.withinTenant(tenant, () => {
                cy.getLocations({
                  limit: 1,
                  query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
                }).then((res) => {
                  testData.defaultLocations[tenant] = res;
                });
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  testData.folioSourceIds[tenant] = folioSource.id;
                });
                InventoryInstances.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then(
                  (loanTypes) => {
                    testData.loanTypeIds[tenant] = loanTypes[0].id;
                  },
                );
                InventoryInstances.getMaterialTypes({ limit: 1, query: 'source=folio' }).then(
                  (materialTypes) => {
                    testData.materialTypeIds[tenant] = materialTypes[0].id;
                  },
                );
              });
            });
          })
          .then(() => {
            cy.resetTenant();
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
              });
            });
          })
          .then(() => {
            folioInstancesShared2 = generateFolioInstancesPayload();
            cy.withinTenant(Affiliations.Consortia, () => {
              cy.log('Creating second set of shared instances');
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: folioInstancesShared2.map((instance) => {
                  return { ...instance, holdings: [], items: [] };
                }),
              });
            });
          })
          .then(() => {
            [Affiliations.College, Affiliations.University].forEach((tenant) => {
              const instancesSet =
                tenant === Affiliations.College ? folioInstancesShared : folioInstancesShared2;
              cy.withinTenant(tenant, () => {
                cy.log('Creating holdings and items for shared instances');
                currentLocation = testData.defaultLocations[tenant];
                instancesSet.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    ...instance.holdings[0],
                    instanceId: instance.instanceId,
                    permanentLocationId: currentLocation.id,
                    sourceId: testData.folioSourceIds[tenant],
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      ...instance.items[0],
                      holdingsRecordId: holding.id,
                      materialType: { id: testData.materialTypeIds[tenant] },
                      permanentLoanType: { id: testData.loanTypeIds[tenant] },
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createTempUser(permissions).then((userProperties) => {
              testData.userProperties = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, permissions);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            callNumberTypesSettings.forEach((setting) => {
              CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
            });
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        removeInstancesByTitle('AT_C656321*');

        cy.resetTenant();
        CallNumberTypesConsortiumManager.deleteViaApi(centralSharedItemCallNumberType);

        cy.setTenant(Affiliations.College);
        callNumberTypesSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
        });
        // eslint-disable-next-line no-unused-expressions
        testData?.userProperties?.userId && Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C656321 Call number of each type which belong to Shared Instances could be found by call number browse and "Held by" filter from Central and Member tenants (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C656321'] },
        () => {
          function browseWithHeldByAndCheck(clearHeldByDefault) {
            [
              BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
              BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
              BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
            ].forEach((browseOption, optionIndex) => {
              const targetTypes = [
                CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
                CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
                CALL_NUMBER_TYPE_NAMES.SUDOC,
              ];
              const tenantToSelect = optionIndex % 2 ? tenantNames.university : tenantNames.college;

              folioInstancesShared.forEach((instance) => {
                const itemCallNumberType = getNameById(instance.items[0].itemLevelCallNumberTypeId);
                const itemCallNumberValue = instance.items[0].itemLevelCallNumber;
                if (
                  targetTypes.includes(itemCallNumberType) &&
                  callNumberTypesSettings
                    .getAssignedCallNumberTypes(browseOption)
                    .includes(itemCallNumberType)
                ) {
                  InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
                  if (clearHeldByDefault) InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
                  cy.wait(500);
                  BrowseCallNumber.waitForCallNumberToAppear(
                    itemCallNumberValue,
                    undefined,
                    undefined,
                    2,
                  );
                  InventorySearchAndFilter.browseSearch(itemCallNumberValue);
                  BrowseCallNumber.valueInResultTableIsHighlighted(itemCallNumberValue);
                  BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 2);

                  InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
                  cy.intercept('/browse/call-numbers/**').as(`browseCall${optionIndex}`);
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    heldbyAccordionName,
                    tenantToSelect,
                  );
                  cy.wait(`@browseCall${optionIndex}`).its('response.statusCode').should('eq', 200);
                  BrowseCallNumber.checkValuePresentInResults(including(`AT_C656321 ${rndm}`));
                  BrowseCallNumber.valueInResultTableIsHighlighted(itemCallNumberValue);
                  BrowseCallNumber.checkNumberOfTitlesForRow(itemCallNumberValue, 1);

                  InventorySearchAndFilter.clickResetAllButton();
                  InventorySearchAndFilter.verifyBrowseResultListExists(false);
                }
              });
            });
          }

          browseWithHeldByAndCheck(true);

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();

          browseWithHeldByAndCheck(false);
        },
      );
    });
  });
});
