import { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { PURCHASE_ORDER_LINES_FIELDS } from '../../../support/constants/query-builder/purchaseOrderLinesFields';
import { ORDER_TYPES } from '../../../support/constants/orders/order';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, {
  purchaseOrderLinesCsvHeaders,
} from '../../../support/fragments/lists/lists-file';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const todayDate = DateTools.getCurrentDate();

const testData = {
  user: {},
  listName: `AT_C983198_List_${randomFourDigitNumber()}`,
  organization: {},
  order: {},
  orderLine: {},
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      const org = NewOrganization.getDefaultOrganization({ isVendor: true });

      Organizations.createOrganizationViaApi(org).then((orgId) => {
        testData.organization.id = orgId;
        testData.organization.name = org.name;

        let acquisitionMethodId;
        let materialTypeId;
        let locationId;

        cy.getAcquisitionMethodsApi({ query: 'value=="Purchase"' }).then((acqMethod) => {
          acquisitionMethodId = acqMethod.body.acquisitionMethods[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          materialTypeId = materialType.id;
        });
        cy.getLocations({ limit: 1 }).then((location) => {
          locationId = location.id;
        });

        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: orgId }),
          orderType: ORDER_TYPES.ONE_TIME_API,
        }).then((orderResp) => {
          testData.order = orderResp;

          cy.then(() => {
            OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.getDefaultOrderLine({
                specialLocationId: locationId,
                specialMaterialTypeId: materialTypeId,
                acquisitionMethod: acquisitionMethodId,
              }),
              purchaseOrderId: orderResp.id,
            }).then((olResp) => {
              testData.orderLine = olResp;
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.listsExport.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(testData.listName);
      Lists.deleteDownloadedFile(testData.listName);
      if (testData.order.id) Orders.deleteOrderViaApi(testData.order.id);
      if (testData.organization.id) {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      }
      if (testData.user.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      "C983198 [POL] Verify that it's possible to run queries for POL in Central tenant and the exporting works fine (consortia) (athena)",
      { tags: ['extendedPathECS', 'athena', 'C983198'] },
      () => {
        // Step 1: Create new list with "Purchase Order lines" record type
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query: PO — Order type IN One-time AND PO — Created at equals today
        QueryModal.selectField(PURCHASE_ORDER_LINES_FIELDS.PO.ORDER_TYPE);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect('One time');
        QueryModal.addNewRow();
        QueryModal.selectField(PURCHASE_ORDER_LINES_FIELDS.PO.CREATED_AT, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(todayDate, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.testQuery();
        QueryModal.testQueryDisabled(true);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 3: Check preview of found records
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Click "Run query & save"
        QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(testData.listName);

          // Step 5: Wait for refresh, then export
          Lists.verifyRefreshCompleteCallout(recordCount);
          Lists.viewUpdatedList();
          Lists.openActions();
          Lists.exportList();
          Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
          Lists.verifyListExportedCalloutMessage(testData.listName);

          // Step 6: Verify exported CSV contains "PO — Order type" = "One-time"
          ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
            testData.listName,
            purchaseOrderLinesCsvHeaders.poNumber,
            Number(testData.order.poNumber),
            [
              {
                header: purchaseOrderLinesCsvHeaders.poType,
                value: ORDER_TYPES.ONE_TIME_API,
              },
            ],
          );
        });
      },
    );
  });
});
