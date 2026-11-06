import { ADJUSTMENT_PRORATE, ADJUSTMENT_RELATION_TO_TOTAL } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InvoiceEditForm, Invoices } from '../../support/fragments/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceCreate],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C359172 Checking the "disallows combinations" in the "Invoice adjustments" field set when creating invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C359172'] },
    () => {
      // Step 1: Click "Actions" button, select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();

      // Step 2: Click "Add adjustment" button
      InvoiceEditForm.fillInvoiceFields({ adjustment: {} });

      // Step 3: Select "Not prorated" in "Pro rate" dropdown
      InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: ADJUSTMENT_PRORATE.NOT_PRORATED });
      cy.wait(1000); // wait for the "Relation to total" field to be updated

      // Step 4: "Relation to total" contains "In addition to" and does not contain "Separate from"
      InvoiceEditForm.checkAdjustmentSelectOptions('relationToTotal', {
        included: [ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO],
        excluded: [ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM],
      });

      // Step 5: Remove all data from "Pro rate" field
      InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: '' });
      cy.wait(1000); // wait for the "Relation to total" field to be updated

      // Step 6: Select "Separate from" in "Relation to total" dropdown
      InvoiceEditForm.fillInvoiceFields({
        adjustmentRelationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM,
      });
      cy.wait(1000); // wait for the "Pro rate" field to be updated

      // Step 7: "Pro rate" contains all prorate options
      InvoiceEditForm.checkAdjustmentSelectOptions('prorate', {
        included: Object.values(ADJUSTMENT_PRORATE),
      });

      // Step 8: Select "Not prorated", "Relation to total" is switched to "In addition to"
      InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: ADJUSTMENT_PRORATE.NOT_PRORATED });
      cy.wait(1000); // wait for the "Relation to total" field to be updated
      InvoiceEditForm.checkAdjustmentSelectOptions('relationToTotal', {
        included: [ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO],
        excluded: [ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM],
      });
      InvoiceEditForm.checkAdjustmentRelationToTotal(ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO);
    },
  );
});
