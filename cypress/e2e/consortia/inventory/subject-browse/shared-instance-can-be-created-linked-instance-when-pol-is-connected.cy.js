import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';

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
        sharedAccordionName: 'Shared',
        subjectBrowseoption: 'Subjects',
        organization: NewOrganization.getDefaultOrganization(),
        order: {},
        user: {},
      };
      let location;
      let servicePointId;
      let instanceHRID;

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersApprovePurchaseOrders.gui,
              Permissions.uiOrdersCreate.gui,
            ]);
            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;
                },
              );
            });
            Organizations.createOrganizationViaApi(testData.organization).then(() => {
              testData.order = NewOrder.getDefaultOngoingOrder({
                vendorId: testData.organization.id,
              });

              Orders.createOrderViaApi(testData.order).then((orderResponse) => {
                testData.order = orderResponse;
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.sharedInstance.title,
            }).then((instanceData) => {
              testData.sharedInstance.id = instanceData.instanceData.instanceId;
              cy.getInstanceHRID(instanceData.instanceData.instanceId).then(
                (instanceHRIDResponse) => {
                  instanceHRID = instanceHRIDResponse;
                },
              );
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              cy.visit(TopMenu.ordersPath);
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Pending' });
        Orders.deleteOrderViaApi(testData.order.id);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.id);
      });

      it(
        'C411665 Shared instance can be created for linked instance record when order line is connected to "Shared instance" (Member tenant) (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C411665'] },
        () => {
          Orders.searchByParameter('PO number', testData.order.poNumber);
          Orders.selectFromResultsList(testData.order.poNumber);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP(testData.sharedInstance.title, 0);
          OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          OrderLines.selectPOLInOrder();
          OrderLines.openInstanceInPOL(testData.sharedInstance.title);
          InventoryInstance.checkInstanceTitle(testData.sharedInstance.title);
          InventoryInstance.checkInstanceHrId(instanceHRID);
        },
      );
    });
  });
});
