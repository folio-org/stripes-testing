import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
  CALL_NUMBER_TYPE_NAMES,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C404367_Instance_${randomPostfix}`;
      const callNumberPrefix = `AT_C404367_CallNumber_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const heldbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const sharedInstanceIndexes = instancesData
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => record.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      const collegeInstanceIndexes = instancesData
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => record.affiliation === Affiliations.College)
        .map(({ index }) => index);
      const universityInstanceIndexes = instancesData
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => record.affiliation === Affiliations.University)
        .map(({ index }) => index);
      const allVisibleInstanceIndexes = [...sharedInstanceIndexes, ...collegeInstanceIndexes];

      const locations = {};
      const loanTypeIds = {};
      const materialTypeIds = {};
      let callNumberTypeLcId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404367');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((loc) => {
              locations[Affiliations.College] = loc;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.College] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.College] = res.id;
            });

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404367');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((loc) => {
              locations[Affiliations.University] = loc;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.University] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.University] = res.id;
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404367');

            CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
              callNumberTypeLcId = res.filter(
                (type) => type.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
              )[0].id;
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);

                    if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                      InventoryInstances.createFolioInstanceViaApi({
                        instance: {
                          instanceTypeId: instanceTypes[0].id,
                          title: `${instanceTitles[index]}`,
                        },
                      }).then((createdInstanceData) => {
                        instanceData.instanceId = createdInstanceData.instanceId;
                      });
                    } else {
                      const marcInstanceFields = [
                        {
                          tag: '008',
                          content: QuickMarcEditor.defaultValid008Values,
                        },
                        {
                          tag: '245',
                          content: `$a ${instanceTitles[index]}`,
                          indicators: ['1', '1'],
                        },
                      ];
                      cy.createMarcBibliographicViaAPI(
                        QuickMarcEditor.defaultValidLdr,
                        marcInstanceFields,
                      ).then((instanceId) => {
                        instanceData.instanceId = instanceId;
                      });
                    }
                  });
                },
              );
            });
          })
          .then(() => {
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              instancesData.forEach((instanceData, instanceIndex) => {
                instanceData.holdings.forEach((holding, holdingsIndex) => {
                  cy.setTenant(holding.affiliation);
                  const holdingsData = {
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holding.affiliation].id,
                    sourceId: folioSource.id,
                  };
                  const currentCallNumber = `${callNumberPrefix}_${instanceIndex}_${holdingsIndex}`;
                  holding.callNumberValue = currentCallNumber;
                  if (holding.callNumberInHoldings) {
                    holdingsData.callNumber = currentCallNumber;
                    holdingsData.callNumberTypeId = callNumberTypeLcId;
                  }
                  InventoryHoldings.createHoldingRecordViaApi(holdingsData).then(
                    (createdHoldings) => {
                      const itemData = {
                        holdingsRecordId: createdHoldings.id,
                        materialType: { id: materialTypeIds[holding.affiliation] },
                        permanentLoanType: { id: loanTypeIds[holding.affiliation] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      };
                      if (!holding.callNumberInHoldings) {
                        itemData.itemLevelCallNumber = currentCallNumber;
                        itemData.itemLevelCallNumberTypeId = callNumberTypeLcId;
                      }
                      InventoryItems.createItemViaApi(itemData);
                    },
                  );
                });
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
              callNumberTypes: [],
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
            );
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C404367 Apply "Shared" facet when Browse for different call numbers existing in different tenants (not exact match) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C404367'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            false,
          );

          allVisibleInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.waitForCallNumberToAppear(holding.callNumberValue, true, 'lc');
            });
          });

          InventorySearchAndFilter.browseSearch(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          allVisibleInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentForRow(
                holding.callNumberValue,
                1,
                instanceTitles[instanceIndex],
              );
              BrowseCallNumber.checkValuePresentForRow(holding.callNumberValue, 2, '1');
            });
          });
          universityInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentInResults(holding.callNumberValue, false);
            });
          });

          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          collegeInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentForRow(
                holding.callNumberValue,
                1,
                instanceTitles[instanceIndex],
              );
              BrowseCallNumber.checkValuePresentForRow(holding.callNumberValue, 2, '1');
            });
          });
          [...sharedInstanceIndexes, ...universityInstanceIndexes].forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentInResults(holding.callNumberValue, false);
            });
          });
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseCallNumber.clickOnResult(
            instancesData[collegeInstanceIndexes[0]].holdings[0].callNumberValue,
          );
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[collegeInstanceIndexes[0]]);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          allVisibleInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentForRow(
                holding.callNumberValue,
                1,
                instanceTitles[instanceIndex],
              );
              BrowseCallNumber.checkValuePresentForRow(holding.callNumberValue, 2, '1');
            });
          });
          universityInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentInResults(holding.callNumberValue, false);
            });
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          sharedInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentForRow(
                holding.callNumberValue,
                1,
                instanceTitles[instanceIndex],
              );
              BrowseCallNumber.checkValuePresentForRow(holding.callNumberValue, 2, '1');
            });
          });
          [...collegeInstanceIndexes, ...universityInstanceIndexes].forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentInResults(holding.callNumberValue, false);
            });
          });
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          BrowseCallNumber.clickOnResult(
            instancesData[sharedInstanceIndexes[0]].holdings[0].callNumberValue,
          );
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[sharedInstanceIndexes[0]]);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          allVisibleInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentForRow(
                holding.callNumberValue,
                1,
                instanceTitles[instanceIndex],
              );
              BrowseCallNumber.checkValuePresentForRow(holding.callNumberValue, 2, '1');
            });
          });
          universityInstanceIndexes.forEach((instanceIndex) => {
            instancesData[instanceIndex].holdings.forEach((holding) => {
              BrowseCallNumber.checkValuePresentInResults(holding.callNumberValue, false);
            });
          });
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
        },
      );
    });
  });
});
