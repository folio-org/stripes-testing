import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      contributor: 'Contributors',
      subject: 'Subjects',
      value: 'a',
      barcode: uuid(),
      callNumber: 'random123',
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

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;
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
          }).then(() => {
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi().then((instanceData) => {
              instanceId = instanceData.instanceData.instanceId;
              cy.setTenant(Affiliations.University);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: location.id,
                callNumber: testData.callNumber,
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
                  cy.login(users.userProperties.username, users.userProperties.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
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
      'C414980 Facet options shown after clicking "Reset all" in Browse and performing search in Central tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C414980'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        cy.wait(1000);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, true);
        InventorySearchAndFilter.verifyNameTypeOption('Personal name');

        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumber);
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.verifyHeldByOption(tenantNames.university);

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.verifyHeldByOption(tenantNames.university);
      },
    );
  });
});
