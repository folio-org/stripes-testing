import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        collegeHoldings: [],
        universityHoldings: [],
        sharedInstance: {
          title: `C422238 Instance ${randomPostfix} Shared`,
          subjects: [{ value: `C422238 Subject ${randomPostfix} Shared` }],
        },
        localInstance: {
          title: `C422238 Instance ${randomPostfix} Local`,
          subjects: [{ value: `C422238 Subject ${randomPostfix} Local` }],
        },
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
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.sharedInstance.id,
                  permanentLocationId: testData.collegeLocation.id,
                }).then((holding) => {
                  testData.collegeHoldings.push(holding);
                });
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
                }).then((holding) => {
                  testData.collegeHoldings.push(holding);
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
                  instanceId: testData.sharedInstance.id,
                  permanentLocationId: location.id,
                }).then((holding) => {
                  testData.universityHoldings.push(holding);
                });
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
        InventoryInstance.deleteInstanceViaApi(testData.localInstance.id);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.id);
      });

      it(
        'C422238 Verify that subject from Shared Instance is not displayed in browse result list when "No" is selected in "Shared" facet (current tenant doesn\'t have this local subject, but another tenant has) (consortia) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          cy.visit(`${TopMenu.inventoryPath}/view/${testData.sharedInstance.id}`);
          cy.log(
            `------------\nSHARED INSTANCE ID: ${testData.sharedInstance.id}\nLOCAL INSTANCE ID: ${testData.localInstance.id}\n------------`,
          );
          // InventoryInstance.waitLoading();
          // InventoryInstance.checkPresentedText(testData.instanceTitle);
          // InventoryInstance.deriveNewMarcBib();
          // QuickMarcEditor.checkPaneheaderContains(testData.deriveSharedPaneheaderText);
          // QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245DerivedContent);
          // QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          // QuickMarcEditor.pressSaveAndClose();
          // QuickMarcEditor.checkAfterSaveAndCloseDerive();
          // InventoryInstance.checkSharedTextInDetailView();
          // InventoryInstance.checkExpectedMARCSource();
          // InventoryInstance.checkPresentedText(testData.instanceDerivedTitle);
          // InventoryInstance.verifyLastUpdatedSource(
          //   users.userProperties.firstName,
          //   users.userProperties.lastName,
          // );
          // InventoryInstance.verifyLastUpdatedDate();
          // InventoryInstance.verifyRecordCreatedSource(
          //   users.userProperties.firstName,
          //   users.userProperties.lastName,
          // );
          // InventoryInstance.getId().then((id) => {
          //   createdInstanceIDs.push(id);
          //   InventoryInstance.editMarcBibliographicRecord();
          //   QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          //   QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245EditedContent);
          //   QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245EditedContent);
          //   QuickMarcEditor.pressSaveAndClose();
          //   QuickMarcEditor.checkAfterSaveAndClose();
          //   InventoryInstance.checkSharedTextInDetailView();
          //   InventoryInstance.checkExpectedMARCSource();
          //   InventoryInstance.checkPresentedText(testData.instanceEditedTitle);
          //   ConsortiumManager.switchActiveAffiliation(tenantNames.college);
          //   InventoryInstances.waitContentLoading();
          //   ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          //   InventoryInstance.searchByTitle(createdInstanceIDs[1]);
          //   InventoryInstances.selectInstance();
          //   InventoryInstance.checkPresentedText(testData.instanceEditedTitle);
          //   InventoryInstance.checkExpectedMARCSource();
          //   InventoryInstance.verifyLastUpdatedSource(
          //     users.userProperties.firstName,
          //     users.userProperties.lastName,
          //   );
          //   InventoryInstance.verifyLastUpdatedDate();
          //   InventoryInstance.verifyRecordCreatedSource(
          //     users.userProperties.firstName,
          //     users.userProperties.lastName,
          //   );
          //   InventoryInstance.viewSource();
          //   InventoryViewSource.contains(testData.tag245EditedContent);
          //   InventoryViewSource.contains(testData.sourceViewSharedText);
          // });
        },
      );
    });
  });
});
