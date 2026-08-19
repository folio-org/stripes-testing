import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  instanceFieldValues,
  usersFieldValues,
  purchaseOrderLinesFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Departments from '../../../support/fragments/settings/users/departments';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const listName = `AT_C594515_List_${getRandomPostfix()}`;
const testData = {
  department: {
    name: `AT_C594515_Dept_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    id: uuid(),
  },
  acquisitionUnit: { name: `AT_C594515_AU_${getRandomPostfix()}` },
  organization: {},
  order: {},
  orderLine: {},
};

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();

      Departments.createViaApi(testData.department).then((departmentId) => {
        testData.department.id = departmentId;
      });

      AcquisitionUnits.createAcquisitionUnitViaApi({
        name: testData.acquisitionUnit.name,
        protectCreate: false,
        protectUpdate: false,
        protectDelete: false,
        protectRead: false,
      }).then((acqUnit) => {
        testData.acquisitionUnit.id = acqUnit.id;

        Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization()).then(
          (orgId) => {
            testData.organization.id = orgId;
            Orders.createOrderViaApi({
              ...NewOrder.getDefaultOrder({ vendorId: orgId }),
              acqUnitIds: [acqUnit.id],
            }).then((order) => {
              testData.order.id = order.id;

              cy.getAcquisitionMethodsApi({ query: 'value="Purchase"' }).then(
                ({ body: { acquisitionMethods } }) => {
                  OrderLines.createOrderLineViaApi(
                    BasicOrderLine.getDefaultOrderLine({
                      purchaseOrderId: order.id,
                      acquisitionMethod: acquisitionMethods[0].id,
                    }),
                  ).then((orderLine) => {
                    testData.orderLine.id = orderLine.id;
                  });
                },
              );
            });
          },
        );
      });

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiUsersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.assignDepartmentsToExistingUser(user.userId, [testData.department.id]);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      OrderLines.deleteOrderLineViaApi(testData.orderLine.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id);
      Departments.deleteViaApi(testData.department.id);
    });

    it(
      'C594515 Verify that some array types are queryable again (athena)',
      { tags: ['criticalPath', 'athena', 'C594515'] },
      () => {
        // Step 1: Users record type — verify "User — Department names" is queryable with results
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.typeInAndSelectField(usersFieldValues.userDepartmentNames);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(testData.department.name, 0);
        QueryModal.testQuery();
        QueryModal.verifyMatchedRecordsByIdentifier(
          user.barcode,
          usersFieldValues.userBarcode,
          user.barcode,
        );

        // Step 2: Purchase order lines record type — verify "PO — Acquisition unit names" is queryable with results
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.typeInAndSelectField(purchaseOrderLinesFieldValues.acquisitionUnitNames);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(testData.acquisitionUnit.name, 0);
        QueryModal.testQuery();
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.orderLine.id,
          purchaseOrderLinesFieldValues.uuid,
          testData.orderLine.id,
        );

        // Step 3: Items record type — verify "Instance — Statistical codes" is available
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.typeInAndSelectField(instanceFieldValues.statisticalCodeNames);

        // Step 4: Holdings record type — verify "Holdings — Statistical codes" is available
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.typeInAndSelectField(holdingsFieldValues.statisticalCodeNames);

        // Step 5: Instances record type — verify "Instance — Statistical codes" is available
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.typeInAndSelectField(instanceFieldValues.statisticalCodeNames);

        // Step 6: Query builder still open on Instances, verify "Instance — Languages" is available
        QueryModal.typeInAndSelectField(instanceFieldValues.languages);

        // Step 7: Verify "Instance — Format names" is available
        QueryModal.typeInAndSelectField(instanceFieldValues.formatNames);
      },
    );
  });
});
