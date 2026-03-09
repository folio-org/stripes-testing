import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventoryHoldingsCreate],
          );

          const collegeLocationData = Locations.getDefaultLocation({
            servicePointId: ServicePoints.getDefaultServicePoint().id,
          }).location;
          Locations.createViaApi(collegeLocationData).then((location) => {
            testData.location = location;
          });
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${testData.instance.instanceId}"`,
        }).then((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        });
        Locations.deleteViaApi({
          id: testData.location.id,
          libraryId: testData.location.libraryId,
          campusId: testData.location.campusId,
          institutionId: testData.location.institutionId,
        });
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C411388 (CONSORTIA) Check member shadow instance and central consortial instance when member holdings are added to a shared instance (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411388'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.addHoldings();
          InventoryNewHoldings.fillPermanentLocation(testData.location.name);
          InventoryNewHoldings.saveAndClose();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceHRID = initialInstanceHrId;

            InstanceRecordView.verifyInstanceSource(testData.instanceSource);
            InstanceRecordView.verifyAddItemButtonVisibility({
              holdingName: 'Consortial holdings',
              shouldBePresent: false,
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventorySearchAndFilter.searchInstanceByHRID(testData.instanceHRID);
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InventoryInstance.verifyConsortiaHoldingsAccordion(false);
            InventoryInstance.expandConsortiaHoldings();
            InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.College);
            InventoryInstance.expandMemberSubHoldings('College');
            InventoryInstance.checkIsHoldingsCreated([`${testData.location.name} >`]);
          });
        },
      );
    });
  });
});
