import uuid from 'uuid';
import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TestTypes from '../../../../../support/dictionary/testTypes';
import DevTeams from '../../../../../support/dictionary/devTeams';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../support/constants';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        collegeHoldings: [],
        sharedInstance: {
          title: `C422238 Instance ${randomPostfix} Shared`,
          subjects: [{ value: `C422238 Subject ${randomPostfix} Shared` }],
          barcode: uuid(),
        },
        localInstance: {
          title: `C422238 Instance ${randomPostfix} Local`,
          subjects: [{ value: `C422238 Subject ${randomPostfix} Local` }],
          barcode: uuid(),
        },
      };

      const users = {};

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.sharedInstance.title,
            }).then((instanceData) => {
              cy.log(JSON.stringify(instanceData));

              testData.sharedInstance.id = instanceData.instanceData.instanceId;
              cy.getInstanceById(testData.sharedInstance.id).then((body) => {
                const requestBody = body;
                requestBody.subjects = testData.sharedInstance.subjects;
                cy.updateInstance(requestBody);
              });

              cy.setTenant(Affiliations.College);
              const props = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint(),
              }).location;
              // location NOT created - need to fix
              Locations.createViaApi(props).then((location) => {
                testData.collegeLocation = location;
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.sharedInstance.id,
                  permanentLocationId: location.id,
                }).then((holding) => {
                  testData.collegeHoldings.push(holding);
                });
              });
            });

            cy.login(users.userProperties.username, users.userProperties.password, {
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
        Users.deleteViaApi(users.userProperties.userId);
        // cy.setTenant(Affiliations.College);
        // testData.collegeHoldings.forEach((holding) => {
        //   InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        // });
        // Locations.deleteViaApi(testData.collegeLocation));

        // cy.resetTenant();
        // InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.id);
      });

      it(
        'C422238 Verify that subject from Shared Instance is not displayed in browse result list when "No" is selected in "Shared" facet (current tenant doesn\'t have this local subject, but another tenant has) (consortia) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // cy.visit(`${TopMenu.inventoryPath}/view/${createdInstanceIDs[0]}`);
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
