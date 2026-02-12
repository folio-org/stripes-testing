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
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C404362_Instance_${randomPostfix}`;
      const callNumberValue = `AT_C404362_CallNumber_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const heldbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
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
              callNumberInHoldings: true,
            },
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
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
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
          affiliation: Affiliations.Consortia,
          holdings: [],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );

      const locations = {};
      const loanTypeIds = {};
      const materialTypeIds = {};
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((userProperties) => {
            user = userProperties;

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404362');
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

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404362');
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

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
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404362');

            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
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
            });
          })
          .then(() => {
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              instancesData.forEach((instanceData) => {
                instanceData.holdings.forEach((holding) => {
                  cy.setTenant(holding.affiliation);
                  const holdingsData = {
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holding.affiliation].id,
                    sourceId: folioSource.id,
                  };
                  if (holding.callNumberInHoldings) {
                    holdingsData.callNumber = callNumberValue;
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
                        itemData.itemLevelCallNumber = callNumberValue;
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
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
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
        'C404362 Correct "Number of titles" shown when browsing Call numbers in Consortia tenants using "Held by" facet (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C404362'] },
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

          BrowseCallNumber.waitForCallNumberToAppear(callNumberValue, undefined, undefined, 7);

          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '7');

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(7);
          instanceTitles.slice(0, 7).forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
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

          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.college,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            false,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '6');

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(6);
          [...instanceTitles.slice(0, 5), instanceTitles[6]].forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '6');

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.university,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '7');

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(7);
          instanceTitles.slice(0, 7).forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            true,
          );
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.college,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '6');

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(5);
          [...instanceTitles.slice(0, 4), instanceTitles[5]].forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          InventoryInstances.waitContentLoading();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '7');
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

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(7);
          [...instanceTitles.slice(0, 6), instanceTitles[7]].forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.college,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '6');

          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyNumberOfSearchResults(5);
          instanceTitles.slice(0, 5).forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        },
      );
    });
  });
});
