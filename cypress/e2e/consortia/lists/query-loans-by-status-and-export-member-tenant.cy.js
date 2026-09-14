/* eslint-disable func-names */
import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { LOANS_FIELDS } from '../../../support/constants/query-builder/loansFields';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { loansCsvHeaders } from '../../../support/fragments/lists/lists-file';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import Users from '../../../support/fragments/users/users';
import UserEdit from '../../../support/fragments/users/userEdit';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const todayDate = DateTools.getCurrentDate();

const testData = {
  user: {},
  // patron is a separate user created directly in College tenant for checkout
  patron: {},
  listName: `AT_C983200_List_${getRandomPostfix()}`,
  instance: { id: null, barcode: `AT_C983200_Item_${getRandomPostfix()}` },
  closedInstance: { id: null, barcode: `AT_C983200_ClosedItem_${getRandomPostfix()}` },
  instanceTypeId: null,
  servicePointId: null,
  userPermissions: [
    Permissions.listsAll.gui,
    Permissions.uiUsersViewLoans.gui,
    Permissions.inventoryAll.gui,
    Permissions.uiUsersView.gui,
  ],
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', function () {
      cy.getAdminToken();
      cy.resetTenant();
      // Skip test if "Enable consortium title level requests (TLR)" active in Settings -> Circulation -> Consortium title level requests (TLR).
      // If this setting is enabled, the item 'Check out' from the member tenant doesn't work, and the test is not applicable for that environment.
      TitleLevelRequests.getConsortiumTitleLevelRequestsStatus().then((isTlrEnabled) => {
        if (isTlrEnabled) {
          this.skip();
        }
      });

      // Create item in College tenant to have a loan to query
      cy.setTenant(Affiliations.College);
      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
        testData.servicePointId = servicePoints[0].id;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
        testData.materialTypeId = materialType.id;
      });
      cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
        testData.loanTypeId = loanTypes[0].id;
      });
      cy.getLocations({ limit: 1 }).then((location) => {
        testData.locationId = location.id;
      });

      cy.resetTenant();
      cy.getAdminToken();

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.user.userId,
          permissions: testData.userPermissions,
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: testData.user.userId,
          permissions: testData.userPermissions,
        });

        // Create instance + item and a local patron in College tenant, then check out
        cy.setTenant(Affiliations.College);
        cy.then(() => {
          // Patron must be created directly in College tenant so their barcode is known there
          cy.createTempUser([]).then((patronProperties) => {
            testData.patron = patronProperties;
            UserEdit.addServicePointViaApi(testData.servicePointId, patronProperties.userId);
          });

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: `AT_C983200_Instance_${getRandomPostfix()}`,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
            items: [
              {
                barcode: testData.instance.barcode,
                status: { name: 'Available' },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then(({ instanceId }) => {
            testData.instance.id = instanceId;
          });

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: `AT_C983200_ClosedInstance_${getRandomPostfix()}`,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
            items: [
              {
                barcode: testData.closedInstance.barcode,
                status: { name: 'Available' },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then(({ instanceId }) => {
            testData.closedInstance.id = instanceId;
          });

          cy.then(() => {
            Checkout.checkoutItemViaApi({
              itemBarcode: testData.instance.barcode,
              servicePointId: testData.servicePointId,
              userBarcode: testData.patron.barcode,
            });
            // Check out then immediately check in to create a closed loan
            Checkout.checkoutItemViaApi({
              itemBarcode: testData.closedInstance.barcode,
              servicePointId: testData.servicePointId,
              userBarcode: testData.patron.barcode,
            }).then(() => {
              CheckInActions.checkinItemViaApi({
                itemBarcode: testData.closedInstance.barcode,
                servicePointId: testData.servicePointId,
              });
            });
          });
        });

        cy.resetTenant();
        cy.getAdminToken();

        cy.login(testData.user.username, testData.user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
        Lists.filtersWaitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      Lists.deleteListByNameViaApi(testData.listName);
      if (testData.instance.id) {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.instance.barcode,
        );
      }
      if (testData.closedInstance.id) {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.closedInstance.barcode,
        );
      }
      if (testData.patron.userId) Users.deleteViaApi(testData.patron.userId);
      cy.resetTenant();
      Lists.deleteDownloadedFile(testData.listName);
      if (testData.user.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C983200 [Loans] Verify that it\'s possible to run queries using the "Loans" ET in Member tenant and the exporting works fine (consortia) (athena)',
      { tags: ['extendedPathECS', 'athena', 'C983200'] },
      () => {
        // Step 1: Create new list with "Loans" record type and open Query builder
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.loans);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Loan Status name IN [Open, Closed] AND Checkout date equals today
        QueryModal.selectField(LOANS_FIELDS.LOAN.STATUS_NAME);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect('Open');
        QueryModal.chooseFromValueMultiselect('Closed');
        QueryModal.addNewRow();
        QueryModal.selectField(LOANS_FIELDS.LOAN.CHECKOUT_DATE, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(todayDate, 1);
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

          // Step 5: Wait for refresh, verify column values, then export all columns
          Lists.verifyRefreshCompleteCallout(recordCount);
          Lists.viewUpdatedList();
          Lists.verifyQueryValue(null, QUERY_OPERATIONS.IN, 'list-column-loans.status_name', [
            'Open',
            'Closed',
          ]);
          Lists.openActions();
          Lists.exportList();
          Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
          Lists.verifyListExportedCalloutMessage(testData.listName);

          // Step 6: Verify CSV — open loan has "Open" and closed loan has "Closed"
          ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
            testData.listName,
            loansCsvHeaders.ITEM.BARCODE,
            testData.instance.barcode,
            [{ header: loansCsvHeaders.LOAN.STATUS_NAME, value: 'Open' }],
          );
          ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
            testData.listName,
            loansCsvHeaders.ITEM.BARCODE,
            testData.closedInstance.barcode,
            [{ header: loansCsvHeaders.LOAN.STATUS_NAME, value: 'Closed' }],
          );
        });
      },
    );
  });
});
