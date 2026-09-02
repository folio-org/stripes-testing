import AcquisitionUnits from '../../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { INVOICES_FIELDS } from '../../../../support/constants/query-builder';
import Invoices from '../../../../support/fragments/invoices/invoices';
import { Lists } from '../../../../support/fragments/lists/lists';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464109';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_List_${getRandomPostfix()}`,
};
const testData = {
  acquisitionUnitId: null,
  acquisitionUnitName: `${titlePrefix}_AcqUnit_${getRandomPostfix()}`,
  vendorOrgId: null,
  vendorOrgName: null,
  invoiceId: null,
  invoiceNumber: null,
};

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoices', () => {
      before('Create test data', () => {
        cy.getAdminToken();

        // Create acquisition unit
        AcquisitionUnits.createAcquisitionUnitViaApi({
          name: testData.acquisitionUnitName,
          protectDelete: false,
          protectCreate: false,
          protectUpdate: false,
        }).then((createdAcqUnit) => {
          testData.acquisitionUnitId = createdAcqUnit.id;

          // Create vendor organization with acquisition unit
          const vendorOrg = {
            ...NewOrganization.getDefaultOrganization({ isVendor: true }),
            acqUnitIds: [createdAcqUnit.id],
          };

          Organizations.createOrganizationViaApi(vendorOrg, { returnBody: true }).then((org) => {
            testData.vendorOrgId = org.id;
            testData.vendorOrgName = org.name;

            // Create invoice with acquisition unit and vendor
            Invoices.createInvoiceViaApi({
              vendorId: org.id,
              acqUnitIds: [createdAcqUnit.id],
              accountingCode: org.erpCode,
            }).then((invoice) => {
              testData.invoiceId = invoice.id;
              testData.invoiceNumber = invoice.vendorInvoiceNo;
            });
          });
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsViewEditDelete.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        if (testData.invoiceId) {
          Invoices.deleteInvoiceViaApi(testData.invoiceId);
        }
        if (testData.vendorOrgId) {
          Organizations.deleteOrganizationViaApi(testData.vendorOrgId);
        }
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1464109 Verify that the Invoices with "Acquisition unit names" and "Vendor name" are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464109'] },
        () => {
          // Step 1: Create new list with Invoices record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.invoices);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Configure the following query with two conditions
          QueryModal.selectField(INVOICES_FIELDS.INVOICE.ACQUISITION_UNIT_NAMES);
          QueryModal.verifySelectedField(INVOICES_FIELDS.INVOICE.ACQUISITION_UNIT_NAMES);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.acquisitionUnitName);

          QueryModal.addNewRow();
          QueryModal.selectField(INVOICES_FIELDS.INVOICE.VENDOR_NAME, 1);
          QueryModal.verifySelectedField(INVOICES_FIELDS.INVOICE.VENDOR_NAME, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.clickOrganizationLookup(1);
          SelectOrganizationModal.filterByOrganizationStatus('Active');
          SelectOrganizationModal.selectOrganizations([testData.vendorOrgName], 'Name');
          SelectOrganizationModal.save();
          SelectOrganizationModal.verifyClosed();
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 3: Check the preview of found records
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.acquisitionUnitName,
            INVOICES_FIELDS.INVOICE.ACQUISITION_UNIT_NAMES,
            testData.acquisitionUnitName,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.acquisitionUnitName,
            INVOICES_FIELDS.INVOICE.VENDOR_NAME,
            testData.vendorOrgName,
          );

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify refresh complete and view updated list
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.viewUpdatedList();

            // Step 6: Verify columns display Invoice — Acquisition unit names and Invoice — Vendor name with proper values
            Lists.verifySingleRecordNumber();
            Lists.verifyResultCellByIdentifier(
              testData.acquisitionUnitName,
              INVOICES_FIELDS.INVOICE.ACQUISITION_UNIT_NAMES,
              testData.acquisitionUnitName,
            );
            Lists.verifyResultCellByIdentifier(
              testData.acquisitionUnitName,
              INVOICES_FIELDS.INVOICE.VENDOR_NAME,
              testData.vendorOrgName,
            );
          });
        },
      );
    });
  });
});
