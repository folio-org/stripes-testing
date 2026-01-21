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
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C784503_Instance_${randomPostfix}`;
      const callNumberPrefix = `AT_C784503_CallNumber_${randomPostfix}`;
      const locationPrefix = `AT_C784503_Location_${randomPostfix}`;
      const locationAccordionName = 'Effective location (item)';
      const instancesData = [
        {
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
          locationIndex: 0,
        },
        {
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
          locationIndex: 0,
        },
        {
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
          locationIndex: 1,
        },
        {
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
          locationIndex: 1,
        },
        {
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
          locationIndex: 0,
        },
        {
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
          locationIndex: 0,
        },
        {
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
          locationIndex: 1,
        },
        {
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
          locationIndex: 1,
        },
      ];
      const callNumberTypesSettings = [
        { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          ],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const locations = {
        [Affiliations.College]: [],
        [Affiliations.University]: [],
      };
      const loanTypeIds = {};
      const materialTypeIds = {};
      let collegeServicePoint;
      let universityServicePoint;
      let commonLocationDataCollege;
      let uniqueLocationDataCollege;
      let commonLocationDataUniversity;
      let uniqueLocationDataUniversity;
      let callNumberTypeId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C784503');
            collegeServicePoint = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(collegeServicePoint);
            uniqueLocationDataCollege = Locations.getDefaultLocation({
              locationName: `${locationPrefix}_College_Unique`,
              servicePointId: collegeServicePoint.id,
            }).location;
            Locations.createViaApi(uniqueLocationDataCollege).then((loc) => {
              locations[Affiliations.College].push(loc);
            });
            commonLocationDataCollege = Locations.getDefaultLocation({
              locationName: `${locationPrefix}_Common`,
              servicePointId: collegeServicePoint.id,
            }).location;
            Locations.createViaApi(commonLocationDataCollege).then((loc) => {
              locations[Affiliations.College].push(loc);
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.College] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.College] = res.id;
            });

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C784503');
            universityServicePoint = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(universityServicePoint);
            uniqueLocationDataUniversity = Locations.getDefaultLocation({
              locationName: `${locationPrefix}_University_Unique`,
              servicePointId: universityServicePoint.id,
            }).location;
            Locations.createViaApi(uniqueLocationDataUniversity).then((loc) => {
              locations[Affiliations.University].push(loc);
            });
            commonLocationDataUniversity = Locations.getDefaultLocation({
              locationName: `${locationPrefix}_Common`,
              servicePointId: universityServicePoint.id,
            }).location;
            Locations.createViaApi(commonLocationDataUniversity).then((loc) => {
              locations[Affiliations.University].push(loc);
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
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C784503');

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
                instancesData.forEach((instanceData, instanceIndex) => {
                  cy.setTenant(instanceData.holdingsAffiliation);
                  const callNumberValue = `${callNumberPrefix}_${instanceIndex}`;
                  instanceData.callNumberValue = callNumberValue;
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId:
                      locations[instanceData.holdingsAffiliation][instanceData.locationIndex].id,
                    sourceId: folioSource.id,
                  }).then((createdHoldings) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: createdHoldings.id,
                      materialType: { id: materialTypeIds[instanceData.holdingsAffiliation] },
                      permanentLoanType: { id: loanTypeIds[instanceData.holdingsAffiliation] },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: callNumberValue,
                      itemLevelCallNumberTypeId: callNumberTypeId,
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            callNumberTypesSettings.forEach((setting) => {
              CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
        callNumberTypesSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
        });

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        Locations.deleteViaApi(commonLocationDataCollege);
        Locations.deleteViaApi(uniqueLocationDataCollege);
        ServicePoints.deleteViaApi(collegeServicePoint.id);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        Locations.deleteViaApi(commonLocationDataUniversity);
        Locations.deleteViaApi(uniqueLocationDataUniversity);
        ServicePoints.deleteViaApi(universityServicePoint.id);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C784503 Verify Tenant name displays next to location in "Effective location" facet during browsing for call numbers in Central tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C784503'] },
        () => {
          const allVisibleCallNumbers = instancesData
            .filter((instanceData) => instanceData.affiliation === Affiliations.Consortia)
            .map((instanceData) => instanceData.callNumberValue);
          const notVisibleCallNumbers = instancesData
            .filter((instanceData) => instanceData.affiliation !== Affiliations.Consortia)
            .map((instanceData) => instanceData.callNumberValue);

          function browseAndCheckLocations() {
            allVisibleCallNumbers.forEach((callNumberValue) => {
              BrowseCallNumber.waitForCallNumberToAppear(callNumberValue);
            });

            InventorySearchAndFilter.browseSearch(allVisibleCallNumbers[0]);
            allVisibleCallNumbers.forEach((callNumberValue) => {
              BrowseCallNumber.checkValuePresentInResults(callNumberValue);
            });
            notVisibleCallNumbers.forEach((callNumberValue) => {
              BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
            });

            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationAccordionName,
            );

            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][1].name,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][1].name,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            [...allVisibleCallNumbers.slice(0, 2), allVisibleCallNumbers[3]].forEach(
              (callNumberValue) => {
                BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
              },
            );
            BrowseCallNumber.checkValuePresentInResults(allVisibleCallNumbers[2]);

            cy.intercept('/browse/call-numbers/all/instances*').as('browseCall1');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            cy.wait('@browseCall1').its('response.statusCode').should('eq', 200);
            cy.intercept('/browse/call-numbers/all/instances*').as('browseCall2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            cy.wait('@browseCall2').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            allVisibleCallNumbers.slice(0, 3).forEach((callNumberValue) => {
              BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
            });
            BrowseCallNumber.checkValuePresentInResults(allVisibleCallNumbers[3]);

            cy.intercept('/browse/call-numbers/all/instances*').as('browseCall3');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            cy.wait('@browseCall3').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
              false,
            );
            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locationPrefix,
              locationPrefix,
            );
            cy.intercept('/browse/call-numbers/all/instances*').as('browseCall4');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            cy.wait('@browseCall4').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            allVisibleCallNumbers.slice(1).forEach((callNumberValue) => {
              BrowseCallNumber.checkValuePresentInResults(callNumberValue, false);
            });
            BrowseCallNumber.checkValuePresentInResults(allVisibleCallNumbers[0]);

            InventorySearchAndFilter.clearFilter(locationAccordionName);
            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName, false);
          }

          browseAndCheckLocations();

          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          );

          browseAndCheckLocations();
        },
      );
    });
  });
});
