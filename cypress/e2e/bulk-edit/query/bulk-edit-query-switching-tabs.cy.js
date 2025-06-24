import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import UserEdit from '../../../support/fragments/users/userEdit';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
let servicePointId;
let item;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Query', () => {
      beforeEach('create test data', () => {
        item = {
          instanceName: `testBulkEdit_${getRandomPostfix()}`,
          barcode: getRandomPostfix(),
        };

        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiUserEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
          ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
            .then((servicePoints) => {
              servicePointId = servicePoints[0].id;
            })
            .then(() => {
              UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
              Checkout.checkoutItemViaApi({
                itemBarcode: item.barcode,
                servicePointId,
                userBarcode: user.barcode,
              });
            });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        CheckInActions.checkinItemViaApi({
          itemBarcode: item.barcode,
          servicePointId,
          checkInDate: new Date().toISOString(),
        });
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      });

      it(
        'C446055 Verify switching between "Identifier" and "Query" tabs (firebird)',
        { tags: ['criticalPath', 'firebird', 'C446055'] },
        () => {
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.isHoldingsRadioChecked(false);
          BulkEditSearchPane.isInstancesRadioChecked(false);
          BulkEditSearchPane.isItemsRadioChecked(false);
          BulkEditSearchPane.isUsersRadioChecked(false);
          BulkEditSearchPane.isBuildQueryButtonDisabled();
          BulkEditSearchPane.verifyInputLabel(
            'Select a record type and then click the Build query button.',
          );
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.isUsersRadioChecked();
          BulkEditSearchPane.verifyInputLabel('Click the Build query button to build the query.');
          BulkEditSearchPane.openIdentifierSearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.verifyInputLabel(
            'Select a record type and then click the Build query button.',
          );
          BulkEditSearchPane.isUsersRadioChecked(false);
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(itemFieldValues.itemStatus);
          QueryModal.verifySelectedField(itemFieldValues.itemStatus);
          QueryModal.verifyQueryAreaContent('(items.status_name  )');
          QueryModal.verifyOperatorColumn();
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(items.status_name in ())');
          QueryModal.verifyValueColumn();
          QueryModal.fillInValueMultiselect(ITEM_STATUS_NAMES.AVAILABLE);
          QueryModal.fillInValueMultiselect(ITEM_STATUS_NAMES.AGED_TO_LOST);
          QueryModal.verifyQueryAreaContent(
            `(items.status_name in [${ITEM_STATUS_NAMES.AVAILABLE}, ${ITEM_STATUS_NAMES.AGED_TO_LOST}])`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          BulkEditSearchPane.verifySpecificTabHighlighted('Query');
          BulkEditSearchPane.isBuildQueryButtonDisabled();
          BulkEditSearchPane.isHoldingsRadioChecked(false);
          BulkEditSearchPane.isInstancesRadioChecked(false);
          BulkEditSearchPane.isItemsRadioChecked();
          BulkEditSearchPane.isUsersRadioChecked(false);
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.isUsersRadioChecked();
          BulkEditSearchPane.matchedAccordionIsAbsent();
          QueryModal.buildQueryButtonDisabled(false);
          BulkEditSearchPane.verifyInputLabel('Click the Build query button to build the query.');
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkLogsCheckbox('New');
          BulkEditLogs.resetAll();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.isUsersRadioChecked();
        },
      );
    });
  },
);
