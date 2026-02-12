import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ITEM_STATUS_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
  CALL_NUMBER_TYPE_NAMES,
} from '../../../../support/constants';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C722363_Instance_${randomPostfix}`;
      const callNumberValue = `AT_C722363_CallNumber_${randomPostfix}`;
      const locationAccordionName = 'Effective location (item)';
      const heldbyAccordionName = 'Held by';
      const sharedAccordionName = 'Shared';
      const instancesData = [
        {
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
            },
            {
              affiliation: Affiliations.University,
            },
          ],
        },
        {
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
            },
          ],
        },
        {
          affiliation: Affiliations.University,
          holdings: [
            {
              affiliation: Affiliations.University,
            },
          ],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const locations = {};
      const loanTypeIds = {};
      const materialTypeIds = {};
      let callNumberTypeId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
            cy.setTenant(Affiliations.College);

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C722363');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.College] = res;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.College] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.College] = res.id;
            });

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C722363');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.University] = res;
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
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C722363');

            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instancesData.forEach((instanceData, index) => {
                cy.setTenant(instanceData.affiliation);
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: `${instanceTitles[index]}`,
                  },
                }).then((createdInstanceData) => {
                  instanceData.instanceId = createdInstanceData.instanceId;
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
                callNumberTypeId = types.find(
                  (type) => type.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
                ).id;
                instancesData.forEach((instanceData) => {
                  instanceData.holdings.forEach((holding) => {
                    cy.setTenant(holding.affiliation);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: locations[holding.affiliation].id,
                      sourceId: folioSource.id,
                    }).then((createdHoldings) => {
                      InventoryItems.createItemViaApi({
                        holdingsRecordId: createdHoldings.id,
                        materialType: { id: materialTypeIds[holding.affiliation] },
                        permanentLoanType: { id: loanTypeIds[holding.affiliation] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        itemLevelCallNumber: callNumberValue,
                        itemLevelCallNumberTypeId: callNumberTypeId,
                      });
                    });
                  });
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
        'C722363 Filter call number browse result list using "Effective location (item)" and “Shared” facets when same call number exist in different Member tenants (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C722363'] },
        () => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumberValue, undefined, undefined, 2);
          // wait to make sure same call number is indexed for all items in instances:
          cy.wait(5000);

          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
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

          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '2');

          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            locations[Affiliations.College].name,
            locations[Affiliations.College].name,
          );
          InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            locations[Affiliations.University].name,
            locations[Affiliations.University].name,
          );
          InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            '',
            '',
          );

          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.University].name,
            tenantNames.university,
          );
          BrowseCallNumber.checkValuePresentInResults(instanceTitles[0]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '1');
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'Yes',
          );

          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall1');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.University].name,
            tenantNames.university,
          );
          cy.wait('@browseCall1').its('response.statusCode').should('eq', 200);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall2');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.College].name,
            tenantNames.college,
          );
          cy.wait('@browseCall2').its('response.statusCode').should('eq', 200);
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'Yes',
          );
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'No',
          );
          BrowseCallNumber.checkValuePresentInResults(instanceTitles[0], false);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '2');

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'Yes',
          );
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'No',
          );
          BrowseCallNumber.checkValuePresentInResults(instanceTitles[1]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '1');

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'Yes',
          );
          InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
            sharedAccordionName,
            'No',
          );
          BrowseCallNumber.checkValuePresentInResults(instanceTitles[1], false);
          BrowseCallNumber.checkValuePresentInResults(instanceTitles[0]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '1');

          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall3');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          cy.wait('@browseCall3').its('response.statusCode').should('eq', 200);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall4');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.College].name,
            tenantNames.college,
          );
          cy.wait('@browseCall4').its('response.statusCode').should('eq', 200);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall5');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          cy.wait('@browseCall5').its('response.statusCode').should('eq', 200);
          InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            locations[Affiliations.College].name,
            locations[Affiliations.College].name,
          );
        },
      );
    });
  });
});
