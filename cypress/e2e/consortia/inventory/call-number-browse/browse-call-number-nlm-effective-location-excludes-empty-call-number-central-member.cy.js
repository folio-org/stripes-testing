import {
  BROWSE_CALL_NUMBER_OPTIONS,
  CALL_NUMBER_TYPE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instancePrefix = `AT_C466192_FolioInstance_${randomPostfix}`;
      const instanceTitles = {
        // The TestRail precondition: Shared instance (Central) and Local instance (Member)
        shared: `${instancePrefix}_Shared`,
        local: `${instancePrefix}_Local`,
        // Shared instance (Central) with Member holdings and 1 item that HAS an NLM call number at
        // the own location - gives the browse row and the facet option a stable counter of 1
        // before the steps run. It has to be shared: Central browse doesn't show local Member
        // instances
        seed: `${instancePrefix}_Seed`,
      };
      // A unique value instead of "test"
      const callNumberValue = `AT_C466192_CN_${randomLetters}`;
      const nlmOption = BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE;
      const nlmTypeName = CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE;
      const locationAccordionName = 'Effective location (item)';
      const testData = {};

      const assignNlmOptionTypes = (callNumberTypes) => {
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: nlmOption,
              callNumberTypes,
            });
          });
        });
      };

      before('Create test data and user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('C466192_');
          });
        });
        // The "National Library of Medicine classification" option has the same call number type
        // selected
        assignNlmOptionTypes([nlmTypeName]);

        cy.then(() => {
          // Own location of the Member tenant: replaces "note the location with the lowest
          // counter" (this release loads every location into the facet, there is no "+ More")
          cy.setTenant(Affiliations.College);
          ServicePoints.getViaApi({ limit: 1, query: 'name<>"*auto*"' }).then((servicePoints) => {
            const { location } = Locations.getDefaultLocation({
              servicePointId: servicePoints[0].id,
              locationName: `ATC466192_${randomLetters}`,
            });

            Locations.createViaApi(location).then((createdLocation) => {
              testData.location = createdLocation;
            });
          });
          CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
            testData.nlmTypeId = types.find((type) => type.name === nlmTypeName).id;
          });
          cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
            testData.collegeInstanceTypeId = instanceTypes[0].id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeId = loanTypes[0].id;
            testData.loanTypeName = loanTypes[0].name;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((materialType) => {
            testData.materialTypeId = materialType.id;
            testData.materialTypeName = materialType.name;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.local,
                instanceTypeId: testData.collegeInstanceTypeId,
              },
            });

            // Instances created in Central are shared
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: instanceTitles.shared,
                  instanceTypeId: instanceTypes[0].id,
                },
              });
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: instanceTitles.seed,
                  instanceTypeId: instanceTypes[0].id,
                },
              }).then((createdInstance) => {
                testData.seedInstanceId = createdInstance.instanceId;
              });
            });
          })
          .then(() => {
            // Member holdings and the item with the NLM call number of the shared seed instance
            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.seedInstanceId,
                permanentLocationId: testData.location.id,
                sourceId: folioSource.id,
              }).then((createdHoldings) => {
                InventoryItems.createItemViaApi({
                  holdingsRecordId: createdHoldings.id,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  itemLevelCallNumber: callNumberValue,
                  itemLevelCallNumberTypeId: testData.nlmTypeId,
                });
              });
            });
          })
          .then(() => {
            // The user is created in Member (primary affiliation) - the test starts there;
            // Central affiliation is automatic, only the permissions are assigned
            cy.setTenant(Affiliations.College);
            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              testData.user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.inventoryAll.gui,
              ]);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete user, data, restore settings', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // No call number types selected is the default of the option
        assignNlmOptionTypes([]);
        // Member holdings of the shared instances are removed from the Member tenant first
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        Locations.deleteViaApi(testData.location);
        Users.deleteViaApi(testData.user.userId);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C466192 "Effective location (item)" facet doesn\'t show locations which are assigned to the items with empty "Effective call number" field during browse by "NLM" option from Central and Member tenants (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C466192'] },
        () => {
          BrowseCallNumber.waitForCallNumberToAppear(
            callNumberValue,
            true,
            callNumbersIds[nlmOption],
          );

          // Step 1: run call number browse by the NLM option; "Effective location (item)"
          // accordion is collapsed
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(nlmOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(nlmOption);
          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.checkSearchResultsTable();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, false);

          // Step 2-3: expand the facet and find the own location (counter 1: the seed item)
          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            testData.location.name,
            true,
            1,
          );
          InventorySearchAndFilter.verifyEcsLocationFilterOptionCount(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
            1,
          );

          // Step 4: click the location - the sum of "Number of titles" (1) matches the counter
          cy.intercept('GET', '**/browse/call-numbers/**').as('browseByLocationMember');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
          );
          cy.wait('@browseByLocationMember');
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);

          // Step 5: Reset all - browse option and input are cleared
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.checkBrowseOptionSelected();
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

          // Step 6: switch to the "Search" tab. Reset all brings the default "Held by" filter back
          // in a Member tenant - cleared, because the instances have no Member holdings yet
          InventorySearchAndFilter.switchToSearchTab();
          InventorySearchAndFilter.verifySearchToggleButtonSelected();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();

          // Step 7: search by the unique prefix - both precondition instances are found
          // (the seed instance has the same prefix and is listed too)
          InventoryInstances.searchByTitle(instancePrefix);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local);

          // Step 8: add Holdings with the own location to the Shared instance
          InventoryInstances.selectInstanceByTitle(instanceTitles.shared);
          InstanceRecordView.waitLoading();
          InstanceRecordView.addHoldings();
          InventoryNewHoldings.fillPermanentLocation(testData.location.name);
          InventoryNewHoldings.saveAndClose();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyIsHoldingsCreated(`${testData.location.name} >`);

          // Step 9: add Item with the NLM call number type and without a Call number
          InstanceRecordView.clickAddItemByHoldingName({ holdingName: testData.location.name });
          ItemRecordNew.fillItemRecordFields({
            materialType: testData.materialTypeName,
            loanType: testData.loanTypeName,
          });
          ItemRecordNew.chooseCallNumberType(nlmTypeName);
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyItemsCount(1, testData.location.name);

          // Step 10: add Holdings with the own location to the Local instance
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventoryInstances.selectInstanceByTitle(instanceTitles.local);
          InstanceRecordView.waitLoading();
          InstanceRecordView.addHoldings();
          InventoryNewHoldings.fillPermanentLocation(testData.location.name);
          InventoryNewHoldings.saveAndClose();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyIsHoldingsCreated(`${testData.location.name} >`);

          // Step 11: add Item with the NLM call number type and without a Call number
          InstanceRecordView.clickAddItemByHoldingName({ holdingName: testData.location.name });
          ItemRecordNew.fillItemRecordFields({
            materialType: testData.materialTypeName,
            loanType: testData.loanTypeName,
          });
          ItemRecordNew.chooseCallNumberType(nlmTypeName);
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyItemsCount(1, testData.location.name);
          InventorySearchAndFilter.closeInstanceDetailPane();

          // Step 12-13: run the same call number browse again
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(nlmOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(nlmOption);
          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.checkSearchResultsTable();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, false);

          // Step 14-15: the counter of the location and the sum of "Number of titles" are
          // unchanged (1) - the new items have an NLM type but no Call number, so they are not
          // counted
          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            testData.location.name,
            true,
            1,
          );
          InventorySearchAndFilter.verifyEcsLocationFilterOptionCount(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
            1,
          );
          cy.intercept('GET', '**/browse/call-numbers/**').as('browseByLocationMemberAgain');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
          );
          cy.wait('@browseByLocationMemberAgain');
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);

          // Step 16: switch the active affiliation to Central. The Member item reaches the Central
          // browse index with a delay - wait for it via API (Central context) first
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();
          cy.withinTenant(Affiliations.Consortia, () => {
            BrowseCallNumber.waitForCallNumberToAppear(
              callNumberValue,
              true,
              callNumbersIds[nlmOption],
            );
          });

          // Step 17-18: run the same call number browse in Central
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(nlmOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(nlmOption);
          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.checkSearchResultsTable();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, false);

          // Step 19-20: the same location from Member - counter and the sum of "Number of
          // titles" are 1
          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            testData.location.name,
            true,
            1,
          );
          InventorySearchAndFilter.verifyEcsLocationFilterOptionCount(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
            1,
          );
          cy.intercept('GET', '**/browse/call-numbers/**').as('browseByLocationCentral');
          InventorySearchAndFilter.selectEcsLocationFilterOption(
            locationAccordionName,
            testData.location.name,
            tenantNames.college,
          );
          cy.wait('@browseByLocationCentral');
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);
        },
      );
    });
  });
});
