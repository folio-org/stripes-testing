import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `C422238 Instance ${randomPostfix}`;
      const subjectPrefix = `C422238 Subject ${randomPostfix}`;
      const testData = {
        collegeHoldings: [],
        universityHoldings: [],
        sharedInstance: {
          title: `${instancePrefix} Shared`,
          subjects: [{ value: `${subjectPrefix} 1` }, { value: `${subjectPrefix} 2` }],
        },
        localInstance: {
          title: `${instancePrefix} Local`,
          subjects: [{ value: `${subjectPrefix} 1` }, { value: `${subjectPrefix} 2` }],
        },
        sharedAccordionName: 'Shared',
        subjectBrowseoption: 'Subjects',
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
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.sharedInstance.title,
            }).then((instanceData) => {
              testData.sharedInstance.id = instanceData.instanceData.instanceId;
              cy.getInstanceById(testData.sharedInstance.id).then((body) => {
                const requestBody = body;
                requestBody.subjects = testData.sharedInstance.subjects;
                cy.updateInstance(requestBody);
              });

              // adding Holdings in College for shared Instance
              cy.setTenant(Affiliations.College);
              const collegeLocationData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              Locations.createViaApi(collegeLocationData).then((location) => {
                testData.collegeLocation = location;
                InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                  (holdingSources) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: testData.sharedInstance.id,
                      permanentLocationId: testData.collegeLocation.id,
                      sourceId: holdingSources[0].id,
                    }).then((holding) => {
                      testData.collegeHoldings.push(holding);
                    });

                    InventoryInstance.createInstanceViaApi({
                      instanceTitle: testData.localInstance.title,
                    }).then((instanceDataLocal) => {
                      testData.localInstance.id = instanceDataLocal.instanceData.instanceId;
                      cy.getInstanceById(testData.localInstance.id).then((body) => {
                        const requestBodyLocal = body;
                        requestBodyLocal.subjects = testData.localInstance.subjects;
                        cy.updateInstance(requestBodyLocal);
                      });

                      // adding Holdings in College for local Instance
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: testData.localInstance.id,
                        permanentLocationId: testData.collegeLocation.id,
                        sourceId: holdingSources[0].id,
                      }).then((holding) => {
                        testData.collegeHoldings.push(holding);
                      });
                    });
                  },
                );
              });

              // adding Holdings in University for shared Instance
              cy.setTenant(Affiliations.University);
              const universityLocationData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              Locations.createViaApi(universityLocationData).then((location) => {
                testData.universityLocation = location;
                InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                  (holdingSources) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: testData.sharedInstance.id,
                      permanentLocationId: location.id,
                      sourceId: holdingSources[0].id,
                    }).then((holding) => {
                      testData.universityHoldings.push(holding);
                    });
                  },
                );
              });
            });

            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
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
        InventoryInstance.deleteInstanceViaApi(testData.localInstance.id);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.id);
      });

      it(
        'C422238 Verify that subject from Shared Instance is not displayed in browse result list when "No" is selected in "Shared" facet (current tenant doesn\'t have this local subject, but another tenant has) (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C422238'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(testData.subjectBrowseoption);
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

          cy.setTenant(Affiliations.University);
          BrowseSubjects.waitForSubjectToAppear(testData.sharedInstance.subjects[0].value);
          BrowseSubjects.waitForSubjectToAppear(testData.sharedInstance.subjects[1].value);
          BrowseSubjects.browse(testData.sharedInstance.subjects[0].value);
          BrowseSubjects.checkValueIsBold(testData.sharedInstance.subjects[0].value);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.sharedInstance.subjects[0].value,
            1,
          );
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.sharedInstance.subjects[1].value,
            1,
          );
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

          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseSubjects.verifyNonExistentSearchResult(testData.sharedInstance.subjects[0].value);
          BrowseSubjects.checkResultIsAbsent(testData.sharedInstance.subjects[1].value);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
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

          BrowseSubjects.verifyClickTakesNowhere(testData.sharedInstance.subjects[0].value);

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseSubjects.checkValueIsBold(testData.sharedInstance.subjects[0].value);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.sharedInstance.subjects[0].value,
            1,
          );
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.sharedInstance.subjects[1].value,
            1,
          );
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

          BrowseSubjects.verifyClickTakesToInventory(testData.sharedInstance.subjects[1].value);
          InventoryInstance.checkSharedTextInDetailView();
        },
      );
    });
  });
});
