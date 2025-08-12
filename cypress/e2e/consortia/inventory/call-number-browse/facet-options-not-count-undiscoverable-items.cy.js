import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenu from '../../../../support/fragments/topMenu';
import Permissions from '../../../../support/dictionary/permissions';
import { CALL_NUMBER_TYPE_NAMES } from '../../../../support/constants';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import users from '../../../../support/fragments/users/users';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import inventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory - Call Number Browse: Facet options do not count undiscoverable items', () => {
  let callNumberTypes = null;
  const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;

  const rndm = getRandomPostfix();
  const generateFolioInstancesPayload = () => {
    return [
      InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `AT_C656327 Instance1 ${rndm}`,
        itemsProperties: {
          itemLevelCallNumber: 'QS 11 .GA1 E59 2005',
          itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS),
        },
      }),
      InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: `AT_C656327 Instance2 ${rndm}`,
        itemsProperties: {
          itemLevelCallNumber: '595.0994',
          itemLevelCallNumberTypeId: getIdByName(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL),
        },
      }),
    ].flat();
  };

  let user;
  const permissions = [
    Permissions.inventoryAll.gui,
    Permissions.consortiaInventoryShareLocalInstance.gui,
  ];

  let folioInstancesShared = null;
  let folioInstancesMember = null;
  let currentLocation = null;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    defaultLocation: {},
  };

  const callNumberBrowseOptionMember = 'Library of Congress classification';
  const centralTenant = { name: tenantNames.central, affiliation: Affiliations.Consortia };
  const memberTenant = { name: tenantNames.university, affiliation: Affiliations.University };
  const callNumberTypesSettings = [
    {
      name: 'Library of Congress classification',
      callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS],
    },
  ];

  before('Setup preconditions', () => {
    cy.getAdminToken();
    callNumberTypesSettings.forEach((setting) => {
      CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
    });

    cy.then(() => {
      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.folioSourceId = folioSource.id;
      });
      InventoryInstances.getLoanTypes().then((loanTypes) => {
        testData.loanTypeId = loanTypes[0].id;
      });
      cy.getMaterialTypes().then((materialType) => {
        testData.materialTypeId = materialType.id;
      });
      [memberTenant.affiliation, centralTenant.affiliation].forEach((tenant) => {
        cy.withinTenant(tenant, () => {
          ServicePoints.getViaApi({ query: 'name=Circ Desk' }).then((servicePoints) => {
            testData.defaultLocation[tenant] = Location.getDefaultLocation(servicePoints[0].id);
            Location.createViaApi(testData.defaultLocation[tenant]);
          });
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C656327');
        });
      });
    })
      .then(() => {
        CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
          callNumberTypes = types;
          folioInstancesShared = generateFolioInstancesPayload().slice(0, 1);
          cy.withinTenant(centralTenant.affiliation, () => {
            cy.log('Creating shared instances');
            currentLocation = testData.defaultLocation[centralTenant.affiliation];
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: folioInstancesShared.map((instance) => {
                return { ...instance, holdings: [], items: [] }; // Shared instances do not have holdings and items in the central tenant
              }),
              location: currentLocation,
            });
          }).then(() => {
            cy.withinTenant(memberTenant.affiliation, () => {
              cy.log('Creating holdings and items for shared instances');
              currentLocation = testData.defaultLocation[memberTenant.affiliation];
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
        cy.getAdminToken();
        cy.withinTenant(memberTenant.affiliation, () => {
          folioInstancesMember = generateFolioInstancesPayload().slice(0, 1);
          cy.log('Creating member instances');
          currentLocation = testData.defaultLocation[memberTenant.affiliation];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstancesMember,
            location: currentLocation,
          });
        });
      });
    cy.createTempUser(permissions).then((userProperties) => {
      user = userProperties;
      cy.affiliateUserToTenant({
        tenantId: memberTenant.affiliation,
        userId: user.userId,
        permissions,
      });

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.waitForAuthRefresh(() => {
        cy.reload();
        InventoryInstances.waitContentLoading();
      });
      ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);
      InventorySearchAndFilter.switchToBrowseTab();
    });
  });

  after('Cleanup', () => {
    cy.getAdminToken();
    [memberTenant.affiliation, centralTenant.affiliation].forEach((tenant) => {
      cy.withinTenant(tenant, () => {
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C656327');
      });
    });
    callNumberTypesSettings.forEach((setting) => {
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        ...setting,
        callNumberTypes: [],
      });
    });
    if (user?.userId) {
      users.deleteViaApi(user.userId);
    }
  });

  it(
    'C656327 "Shared" facet doesn\'t count Instances with "Call number" value on browse pane when "Call number" has not discoverable call number type',
    { tags: ['criticalPathECS', 'spitfire', 'C656327'] },
    () => {
      // Step 1: Run a browse using "Library of Congress classification"
      InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(callNumberBrowseOptionMember);
      InventorySearchAndFilter.browseSearch('test');

      // Step 2: Expand "Shared" accordion and note counter values
      BrowseCallNumber.SharedAccordion.open().then((sharedCounts) => {
        // Step 3: Reset the search
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.switchToSearchTab();

        // Step 4: Create a shared Instance with non-LC call number
        cy.withinTenant(memberTenant.affiliation, () => {
          folioInstancesMember = generateFolioInstancesPayload().slice(1, 2);
          currentLocation = testData.defaultLocation[memberTenant.affiliation];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstancesMember,
            location: currentLocation,
          });
        });
        InventorySearchAndFilter.byKeywords(folioInstancesMember[0].instanceTitle);
        InventorySearchAndFilter.byShared('No');
        InventorySearchAndFilter.selectSearchResultItem();
        inventoryInstance.shareInstance();

        // Step 5: Create a local Instance with non-LC call number
        cy.withinTenant(memberTenant.affiliation, () => {
          folioInstancesMember = generateFolioInstancesPayload().slice(1, 2);
          currentLocation = testData.defaultLocation[memberTenant.affiliation];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstancesMember,
            location: currentLocation,
          });
        });

        // Step 6: Run a browse using "Library of Congress classification" again
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          callNumberBrowseOptionMember,
        );
        InventorySearchAndFilter.browseSearch('test');

        // Step 7: Expand "Shared" accordion and verify counter values
        BrowseCallNumber.SharedAccordion.open().then((sharedCountsAfter) => {
          expect(sharedCountsAfter.shared).to.equal(sharedCounts.shared);
          expect(sharedCountsAfter.local).to.equal(sharedCounts.local);
        });
      });
    },
  );
});
