import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `C422237Auto Instance ${randomPostfix}`;
      const contributorPrefix = `C422237Auto Contributor ${randomPostfix}`;
      const testData = {
        collegeHoldings: [],
        universityHoldings: [],
        sharedInstanceTitle: `${instancePrefix} Shared`,
        localInstanceTitle: `${instancePrefix} Local College`,
        sharedAccordionName: 'Shared',
        contributorBrowseoption: 'Contributors',
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, testData.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              BrowseContributors.getContributorTypes().then((contributorTypes) => {
                InventoryInstance.createInstanceViaApi({
                  instanceTitle: testData.sharedInstanceTitle,
                }).then(({ instanceData }) => {
                  cy.getInstanceById(instanceData.instanceId).then((body) => {
                    const requestBodyShared = body;
                    requestBodyShared.contributors = [
                      {
                        name: `${contributorPrefix} 1`,
                        contributorNameTypeId: contributorNameTypes[0].id,
                        contributorTypeId: contributorTypes[0].id,
                        contributorTypeText: '',
                        primary: false,
                      },
                      {
                        name: `${contributorPrefix} 2`,
                        contributorNameTypeId: contributorNameTypes[0].id,
                        contributorTypeId: contributorTypes[0].id,
                        contributorTypeText: '',
                        primary: false,
                      },
                    ];
                    cy.updateInstance(requestBodyShared);
                  });
                  testData.sharedInstanceId = instanceData.instanceId;
                  testData.contributorNameTypeName = contributorNameTypes[0].name;
                  testData.contributorTypeName = contributorTypes[0].name;

                  cy.setTenant(Affiliations.College);
                  InventoryInstance.createInstanceViaApi({
                    instanceTitle: testData.localInstanceTitle,
                  }).then((body) => {
                    cy.getInstanceById(body.instanceData.instanceId).then((body2) => {
                      const requestBodyLocal = body2;
                      requestBodyLocal.contributors = [
                        {
                          name: `${contributorPrefix} 1`,
                          contributorNameTypeId: contributorNameTypes[0].id,
                          contributorTypeId: contributorTypes[0].id,
                          contributorTypeText: '',
                          primary: false,
                        },
                        {
                          name: `${contributorPrefix} 2`,
                          contributorNameTypeId: contributorNameTypes[0].id,
                          contributorTypeId: contributorTypes[0].id,
                          contributorTypeText: '',
                          primary: false,
                        },
                      ];
                      cy.updateInstance(requestBodyLocal);
                    });
                    testData.localInstanceId = body.instanceData.instanceId;

                    // adding Holdings in College for shared Instance
                    cy.setTenant(Affiliations.College);
                    const collegeLocationData = Locations.getDefaultLocation({
                      servicePointId: ServicePoints.getDefaultServicePoint().id,
                    }).location;
                    Locations.createViaApi(collegeLocationData).then((location) => {
                      testData.collegeLocation = location;
                      InventoryHoldings.getHoldingsFolioSource()
                        .then((folioSource) => {
                          testData.folioSourceId = folioSource.id;
                        })
                        .then(() => {
                          InventoryHoldings.createHoldingRecordViaApi({
                            instanceId: testData.sharedInstanceId,
                            permanentLocationId: testData.collegeLocation.id,
                            sourceId: testData.folioSourceId,
                          }).then((holding) => {
                            testData.collegeHoldings.push(holding);
                            // adding Holdings in College for local Instance
                            InventoryHoldings.createHoldingRecordViaApi({
                              instanceId: testData.localInstanceId,
                              permanentLocationId: testData.collegeLocation.id,
                              sourceId: testData.folioSourceId,
                            }).then((holding2) => {
                              testData.collegeHoldings.push(holding2);
                            });
                          });
                        });
                    });
                  });

                  // adding Holdings in University for shared Instance
                  cy.setTenant(Affiliations.University);
                  const universityLocationData = Locations.getDefaultLocation({
                    servicePointId: ServicePoints.getDefaultServicePoint().id,
                  }).location;
                  Locations.createViaApi(universityLocationData).then((location) => {
                    testData.universityLocation = location;
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: testData.sharedInstanceId,
                      permanentLocationId: location.id,
                      sourceId: testData.folioSourceId,
                    }).then((holding) => {
                      testData.universityHoldings.push(holding);
                    });
                  });
                });
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        testData.collegeHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.collegeLocation);
        cy.setTenant(Affiliations.University);
        testData.universityHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.universityLocation);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.localInstanceId);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
      });

      it(
        'C422237 Verify that contributors from Shared Instance is not displayed in browse result list when "No" is selected in "Shared" facet (current tenant doesn\'t have this local contributor, but another tenant has) (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C422237'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(testData.contributorBrowseoption);
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseContributors.browse(`${contributorPrefix} 1`);
          BrowseContributors.checkSearchResultRecord(`${contributorPrefix} 1`);
          BrowseContributors.checkSearchResultRow(
            `${contributorPrefix} 1`,
            testData.contributorNameTypeName,
            testData.contributorTypeName,
            '1',
          );
          BrowseContributors.checkSearchResultRow(
            `${contributorPrefix} 2`,
            testData.contributorNameTypeName,
            testData.contributorTypeName,
            '1',
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseContributors.checkNonExactMatchPlaceholder(`${contributorPrefix} 1`);
          BrowseContributors.checkValueAbsentInResults(`${contributorPrefix} 2`);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
          BrowseSubjects.verifyClickTakesNowhere(`${contributorPrefix} 1`);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseContributors.checkSearchResultRecord(`${contributorPrefix} 1`);
          BrowseContributors.checkSearchResultRow(
            `${contributorPrefix} 1`,
            testData.contributorNameTypeName,
            testData.contributorTypeName,
            '1',
          );
          BrowseContributors.checkSearchResultRow(
            `${contributorPrefix} 2`,
            testData.contributorNameTypeName,
            testData.contributorTypeName,
            '1',
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseSubjects.verifyClickTakesToInventory(`${contributorPrefix} 2`);
          InventoryInstance.checkSharedTextInDetailView();
        },
      );
    });
  });
});
