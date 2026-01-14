import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('Orders', () => {
  describe('Consortium (Orders)', () => {
    const randomPostfix = getRandomPostfix();
    const firtstInstancePrefix = `C411683-A Instance ${randomPostfix}`;
    const firstSubjectPrefix = `C411683-A Subject ${randomPostfix}`;
    const secondInstancePrefix = `C411683-B Instance ${randomPostfix}`;
    const secondSubjectPrefix = `C411683-B Subject ${randomPostfix}`;
    const testData = {
      collegeHoldings: [],
      universityHoldings: [],
      firstSharedInstance: {
        title: `${firtstInstancePrefix} Shared`,
        subjects: [{ value: `${firstSubjectPrefix} 1` }, { value: `${firstSubjectPrefix} 2` }],
      },
      secondSharedInstance: {
        title: `${secondInstancePrefix} Shared`,
        subjects: [{ value: `${secondSubjectPrefix} 1` }, { value: `${secondSubjectPrefix} 2` }],
      },
      sharedAccordionName: 'Shared',
      subjectBrowseoption: 'Subjects',
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    let location;
    let servicePointId;
    let secondInstanceHRID;

    before('Create user, data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi({
        instanceTitle: testData.firstSharedInstance.title,
      }).then((instanceData) => {
        testData.firstSharedInstance.id = instanceData.instanceData.instanceId;
      });
      InventoryInstance.createInstanceViaApi({
        instanceTitle: testData.secondSharedInstance.title,
      }).then((instanceData) => {
        testData.secondSharedInstance.id = instanceData.instanceData.instanceId;
        cy.getInstanceHRID(instanceData.instanceData.instanceId).then(
          (secondInstanceHRIDResponse) => {
            secondInstanceHRID = secondInstanceHRIDResponse;
          },
        );
      });
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersEdit.gui,
        ]);
        ServicePoints.getViaApi().then((servicePoint) => {
          servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
            location = res;
          });
        });
        Organizations.createOrganizationViaApi(testData.organization)
          .then(() => {
            testData.order = NewOrder.getDefaultOngoingOrder({
              vendorId: testData.organization.id,
            });

            Orders.createOrderViaApi(testData.order).then((orderResponse) => {
              testData.order = orderResponse;
              cy.loginAsCollegeAdmin({
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
              Orders.searchByParameter('PO number', testData.order.poNumber);
              Orders.selectFromResultsList(testData.order.poNumber);
              OrderLines.addPOLine();
              OrderLines.selectRandomInstanceInTitleLookUP(testData.firstSharedInstance.title, 0);
              OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
              OrderLines.backToEditingOrder();
              Orders.openOrder();
            });
          })
          .then(() => {
            cy.resetTenant();
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
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      cy.setTenant(Affiliations.College);
      Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Pending' });
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      cy.resetTenant();
      InventoryInstance.deleteInstanceViaApi(testData.firstSharedInstance.id);

      InventoryInstance.deleteInstanceViaApi(testData.secondSharedInstance.id);
    });

    it(
      'C411683 Shared instance can be created for linked instance record when user executes "Change instance connection" (member tenant) (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C411683'] },
      () => {
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderLines.selectPOLInOrder();
        OrderLines.changeInstanceConnectionInActions();
        OrderLines.selectInstanceInSelectInstanceModal(testData.secondSharedInstance.title, 0);
        OrderLines.submitCreateNewInChangeTitleModal('Keep Holdings');
        OrderLines.openInstanceInPOL(testData.secondSharedInstance.title);
        InventoryInstance.checkInstanceTitle(testData.secondSharedInstance.title);
        InventoryInstance.checkInstanceHrId(secondInstanceHRID);
      },
    );
  });
});
