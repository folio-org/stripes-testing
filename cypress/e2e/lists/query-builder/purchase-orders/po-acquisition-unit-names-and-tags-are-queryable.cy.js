import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { PURCHASE_ORDER_FIELDS } from '../../../../support/constants/query-builder';
import { Lists } from '../../../../support/fragments/lists/lists';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import { AcquisitionUnits } from '../../../../support/fragments/settings/acquisitionUnits';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464061';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_PO_List_${getRandomPostfix()}`,
  description: `${titlePrefix}_PO_list_description`,
};
const testData = {
  acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({
    name: `${titlePrefix}_AcqUnit_${getRandomPostfix()}`,
    protectRead: false,
    protectUpdate: false,
    protectCreate: false,
    protectDelete: false,
  }),
  acqUnitMembershipId: null,
  organization: {},
  order: {},
  tag: `${titlePrefix}_tag_${getRandomPostfix()}`.toLowerCase(),
  tagId: null,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Purchase orders', () => {
      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit))
          .then((acqUnit) => {
            testData.acqUnit.id = acqUnit.id;
          })
          .then(() => {
            const org = NewOrganization.getDefaultOrganization({ isVendor: true });
            return Organizations.createOrganizationViaApi(org).then((orgId) => {
              testData.organization.id = orgId;
              testData.organization.name = org.name;
            });
          })
          .then(() => {
            Organizations.createTagViaApi(testData.tag).then((tagId) => {
              testData.tagId = tagId;
            });
          })
          .then(() => {
            return Orders.createOrderViaApi({
              ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              orderType: 'One-Time',
              acqUnitIds: [testData.acqUnit.id],
              tags: { tagList: [testData.tag] },
            }).then((orderResp) => {
              testData.order = orderResp;
            });
          })
          .then(() => {
            return cy
              .createTempUser([
                Permissions.listsAll.gui,
                Permissions.uiOrdersCreate.gui,
                Permissions.uiOrganizationsViewEditCreate.gui,
              ])
              .then((userProperties) => {
                user = userProperties;

                AcquisitionUnits.assignUserViaApi(user.userId, testData.acqUnit.id).then(
                  (membershipId) => {
                    testData.acqUnitMembershipId = membershipId;
                  },
                );

                cy.login(user.username, user.password, {
                  path: TopMenu.listsPath,
                  waiter: Lists.waitLoading,
                });
              });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);

        if (testData.order.id) Orders.deleteOrderViaApi(testData.order.id);
        if (testData.acqUnitMembershipId) {
          AcquisitionUnits.unAssignUserViaApi(testData.acqUnitMembershipId);
        }
        if (testData.acqUnit.id) {
          AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id, false);
        }
        if (testData.tagId) Organizations.deleteTagByIdViaApi(testData.tagId);
        if (testData.organization.id) {
          Organizations.deleteOrganizationViaApi(testData.organization.id);
        }
        if (user && user.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C1464061 Verify that the Purchase orders with "Acquisition unit names" and "Tags" are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464061'] },
        () => {
          // Step 1: Create new list with Purchase orders record type and open Build query
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.purchaseOrders);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Configure query: Acquisition unit names = acqUnit AND Tags in tag, then test
          QueryModal.typeInAndSelectField(PURCHASE_ORDER_FIELDS.ACQUISITION_UNIT_NAMES);
          QueryModal.verifySelectedField(PURCHASE_ORDER_FIELDS.ACQUISITION_UNIT_NAMES);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.acqUnit.name);
          QueryModal.addNewRow();
          QueryModal.typeInAndSelectField(PURCHASE_ORDER_FIELDS.TAGS, 1);
          QueryModal.verifySelectedField(PURCHASE_ORDER_FIELDS.TAGS, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.fillInValueMultiselect(testData.tag, 1);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 3: Verify preview shows matched records with Acquisition unit names and Tags columns
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.order.poNumber,
            PURCHASE_ORDER_FIELDS.ACQUISITION_UNIT_NAMES,
            testData.acqUnit.name,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.order.poNumber,
            PURCHASE_ORDER_FIELDS.TAGS,
            testData.tag,
          );

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify refresh complete toast with matching record count
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list"
            Lists.viewUpdatedList();

            // Step 7: Verify Acquisition unit names and Tags columns with correct values
            Lists.openActions();
            Lists.verifyCheckboxInShowColumnsChecked(
              PURCHASE_ORDER_FIELDS.ACQUISITION_UNIT_NAMES,
              true,
            );
            Lists.verifyCheckboxInShowColumnsChecked(PURCHASE_ORDER_FIELDS.TAGS, true);
            Lists.verifyResultCellByIdentifier(
              testData.order.poNumber,
              PURCHASE_ORDER_FIELDS.ACQUISITION_UNIT_NAMES,
              testData.acqUnit.name,
            );
            Lists.verifyResultCellByIdentifier(
              testData.order.poNumber,
              PURCHASE_ORDER_FIELDS.TAGS,
              testData.tag,
            );
          });
        },
      );
    });
  });
});
