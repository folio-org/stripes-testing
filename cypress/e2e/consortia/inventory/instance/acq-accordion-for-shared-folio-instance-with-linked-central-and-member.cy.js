import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  VENDOR_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import Orders from '../../../../support/fragments/orders/orders';
import Organizations from '../../../../support/fragments/organizations/organizations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        centralOrder: {},
        centralOrderLine: {
          quantity: '1',
          price: '10',
        },
        memberOrder: {},
        memberOrderLine: {
          quantity: '1',
          price: '10',
        },
        user: {},
      };
      const userPermissions = [Permissions.inventoryAll.gui, Permissions.uiOrdersView.gui];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.instance = instanceData;

            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
              (organization) => {
                testData.centralOrderLine.vendorId = organization.id;
              },
            );
            cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
              testData.centralOrderLine.locationId = res.id;
            });
            cy.getBookMaterialType().then((materialType) => {
              testData.centralOrderLine.materialTypeId = materialType.id;
            });
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              testData.centralOrderLine.acquisitionMethodId = params.body.acquisitionMethods[0].id;
            });
          })
          .then(() => {
            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.centralOrderLine.vendorId }),
              BasicOrderLine.getDefaultOrderLine({
                quantity: testData.centralOrderLine.quantity,
                title: testData.instance.instanceTitle,
                instanceId: testData.instance.instanceId,
                specialLocationId: testData.centralOrderLine.locationId,
                specialMaterialTypeId: testData.centralOrderLine.materialTypeId,
                acquisitionMethod: testData.centralOrderLine.acquisitionMethodId,
                listUnitPrice: testData.centralOrderLine.price,
                poLineEstimatedPrice: testData.centralOrderLine.price,
                createInventory: 'Instance',
              }),
            ).then((order) => {
              testData.centralOrder = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            });
          });

        cy.setTenant(Affiliations.College)
          .then(() => {
            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
              (organization) => {
                testData.memberOrderLine.vendorId = organization.id;
              },
            );
            cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
              testData.memberOrderLine.locationId = res.id;
            });
            cy.getBookMaterialType().then((materialType) => {
              testData.memberOrderLine.materialTypeId = materialType.id;
            });
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              testData.memberOrderLine.acquisitionMethodId = params.body.acquisitionMethods[0].id;
            });
          })
          .then(() => {
            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.memberOrderLine.vendorId }),
              BasicOrderLine.getDefaultOrderLine({
                quantity: testData.memberOrderLine.quantity,
                title: testData.instance.instanceTitle,
                instanceId: testData.instance.instanceId,
                specialLocationId: testData.memberOrderLine.locationId,
                specialMaterialTypeId: testData.memberOrderLine.materialTypeId,
                acquisitionMethod: testData.memberOrderLine.acquisitionMethodId,
                listUnitPrice: testData.memberOrderLine.price,
                poLineEstimatedPrice: testData.memberOrderLine.price,
                createInventory: 'Instance',
              }),
            ).then((order) => {
              testData.memberOrder = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            });
          });
        cy.resetTenant();

        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Orders.deleteOrderViaApi(testData.memberOrder.id);
        cy.resetTenant();
        cy.getAdminToken();
        Orders.deleteOrderViaApi(testData.centralOrder.id);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C476709 (CONSORTIA) Check Acquisition accordion for shared FOLIO instance with linked central and member tenants (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C476709'] },
        () => {
          const memberPolNumber = `${testData.memberOrder.poNumber}-1`;
          const centralPolNumber = `${testData.centralOrder.poNumber}-1`;

          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.collapseAll();
          InstanceRecordView.openAcquisitionAccordion();
          InstanceRecordView.verifyMemberTenantSubAccordionInAcquisitionAccordion(memberPolNumber);
          InstanceRecordView.verifyCentralTenantSubAccordionInAcquisitionAccordion(
            centralPolNumber,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyAcquisitionAccordionDetails([
            centralPolNumber,
            'Open',
            'Awaiting receipt',
          ]);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.collapseAll();
          InstanceRecordView.verifyMemberTenantSubAccordionInAcquisitionAccordionIsEmpty();
          InstanceRecordView.verifyCentralTenantSubAccordionInAcquisitionAccordion(
            centralPolNumber,
          );
        },
      );
    });
  });
});
