import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      contributor: 'Contributors',
      value: 'a',
      subject: 'Subjects',
      barcode: uuid(),
      callNumber: 'randomC414981',
    };

    const Dropdowns = {
      EFFECTIVE_LOCATION: 'Effective location (item)',
      NAME_TYPE: 'Name type',
      SHARED: 'Shared',
      HELD_BY: 'Held by',
    };

    const users = {};
    let instanceId;
    let location;
    let loanTypeId;
    let materialTypeId;
    let sourceId;
    let callNumberTypeId;

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.then(() => {
            const locationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(locationData).then((loc) => {
              location = loc;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              loanTypeId = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              materialTypeId = matType.id;
            });
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                sourceId = holdingSources[0].id;
              },
            );
            InventoryInstances.getCallNumberTypes({
              query: `name="${BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL}"`,
            }).then((res) => {
              callNumberTypeId = res[0].id;
            });
          }).then(() => {
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi().then((instanceData) => {
              instanceId = instanceData.instanceData.instanceId;
              cy.setTenant(Affiliations.University);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: location.id,
                callNumber: testData.callNumber,
                callNumberTypeId,
                sourceId,
              }).then((holding) => {
                InventoryItems.createItemViaApi({
                  holdingsRecordId: holding.id,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: 'Available' },
                  barcode: testData.barcode,
                }).then(() => {
                  cy.resetTenant();
                  cy.waitForAuthRefresh(() => {
                    cy.login(users.userProperties.username, users.userProperties.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventoryInstances.waitContentLoading,
                    });
                    cy.reload();
                    InventoryInstances.waitContentLoading();
                  }, 20_000);
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.central,
                    tenantNames.college,
                  );
                  InventoryInstances.waitContentLoading();
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                });
              });
            });
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
      cy.setTenant(Affiliations.University);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      Locations.deleteViaApi(location);
      cy.deleteLoanType(loanTypeId);
    });

    it(
      'C414981 Facet options shown after clicking "Reset all" in Browse and performing search in Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C414981'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, true);
        InventorySearchAndFilter.verifyNameTypeOption('Personal name');

        InventorySearchAndFilter.selectBrowseOption(testData.subject);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.subject);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');

        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumber);
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        cy.wait(3000);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.verifyHeldByOption(tenantNames.university);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          Dropdowns.EFFECTIVE_LOCATION,
        );

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
        InventorySearchAndFilter.verifyHeldByOption(tenantNames.university);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          Dropdowns.EFFECTIVE_LOCATION,
        );
      },
    );
  });
});
