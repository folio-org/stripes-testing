import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C692203_Instance_${randomPostfix}`;
      const callNumberValue = `AT_C692203_CallNumber_${randomPostfix}`;
      const callNumbersFromShared = {
        college: 'AT_C692203_Shared_College',
        university: 'AT_C692203_Shared_University',
      };
      const nonExactQuery = callNumberValue.slice(0, -1);
      const locationAccordionName = 'Effective location (item)';
      const heldbyAccordionName = 'Held by';
      const sharedAccordionName = 'Shared';
      const collegeInstances = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `${instancePrefix}_College`,
        itemsProperties: { itemLevelCallNumber: callNumberValue },
      });
      const universityInstances = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `${instancePrefix}_University`,
        itemsProperties: { itemLevelCallNumber: callNumberValue },
      });
      const sharedInstances = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `${instancePrefix}_Shared`,
        holdingsCount: 0,
        itemsCount: 0,
      });
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

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C692203');

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
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C692203');

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
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C692203');

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: sharedInstances,
              location: locations[Affiliations.College],
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              const holdingsData = {
                instanceId: sharedInstances[0].instanceId,
                permanentLocationId: locations[Affiliations.College].id,
                sourceId: folioSource.id,
                callNumber: callNumbersFromShared.college,
              };
              InventoryHoldings.createHoldingRecordViaApi(holdingsData).then((createdHoldings) => {
                const itemData = {
                  holdingsRecordId: createdHoldings.id,
                  materialType: { id: materialTypeIds[Affiliations.College] },
                  permanentLoanType: { id: loanTypeIds[Affiliations.College] },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                };
                InventoryItems.createItemViaApi(itemData);
              });
            });

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: collegeInstances,
              location: locations[Affiliations.College],
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              const holdingsData = {
                instanceId: sharedInstances[0].instanceId,
                permanentLocationId: locations[Affiliations.University].id,
                sourceId: folioSource.id,
                callNumber: callNumbersFromShared.university,
              };
              InventoryHoldings.createHoldingRecordViaApi(holdingsData).then((createdHoldings) => {
                const itemData = {
                  holdingsRecordId: createdHoldings.id,
                  materialType: { id: materialTypeIds[Affiliations.University] },
                  permanentLoanType: { id: loanTypeIds[Affiliations.University] },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                };
                InventoryItems.createItemViaApi(itemData);
              });
            });

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: universityInstances,
              location: locations[Affiliations.University],
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
            cy.setTenant(Affiliations.University);
            BrowseCallNumber.waitForCallNumberToAppear(callNumberValue);
            BrowseCallNumber.waitForCallNumberToAppear(callNumbersFromShared.university);
            BrowseCallNumber.waitForCallNumberToAppear(callNumbersFromShared.college);
            cy.setTenant(Affiliations.College);
            BrowseCallNumber.waitForCallNumberToAppear(callNumberValue);
            BrowseCallNumber.waitForCallNumberToAppear(callNumbersFromShared.college);
            BrowseCallNumber.waitForCallNumberToAppear(callNumbersFromShared.university);

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
        'C692203 Use facets when there are same call numbers in different Local Instances with different selected locations (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C692203'] },
        () => {
          InventorySearchAndFilter.browseSearch(nonExactQuery);
          BrowseCallNumber.checkNonExactSearchResult(nonExactQuery);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue);

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

          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall1');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.University].name,
            tenantNames.university,
          );
          cy.wait('@browseCall1').its('response.statusCode').should('eq', 200);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);

          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall2');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          cy.wait('@browseCall2').its('response.statusCode').should('eq', 200);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);

          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall3');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.university,
          );
          cy.wait('@browseCall3').its('response.statusCode').should('eq', 200);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
          );

          InventorySearchAndFilter.clearFilter(heldbyAccordionName);
          InventorySearchAndFilter.clearFilter(locationAccordionName);
          InventorySearchAndFilter.clearFilter(sharedAccordionName);

          BrowseCallNumber.checkValuePresentInResults(callNumberValue);
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.college,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
          );
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall4');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            locations[Affiliations.College].name,
            tenantNames.college,
          );
          cy.wait('@browseCall4').its('response.statusCode').should('eq', 200);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);

          cy.wait(2000);
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue);
          cy.intercept('/browse/call-numbers/all/instances*').as('browseCall5');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          cy.wait('@browseCall5').its('response.statusCode').should('eq', 200);
          BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
          BrowseCallNumber.checkNotExistingCallNumber(nonExactQuery);
        },
      );
    });
  });
});
