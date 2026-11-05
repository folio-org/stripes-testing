import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TagsPane from '../../support/fragments/tagsPane';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Invoices', () => {
  const NEW_TAG_CREATED_MESSAGE = 'New tag created';
  const SPECIAL_CHARACTERS = '!@$=_,~.:/';
  const testData = {};

  before('Create test data', () => {
    const getSpecialCharactersTagName = () => String(randomNDigitNumber(12)).replace(/\d/g, (digit) => SPECIAL_CHARACTERS[digit]);

    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C6721_Organization_${getRandomPostfix()}`,
    };
    testData.existingTag = { label: `at_c6721_existingtag_${getRandomPostfix()}` };
    testData.secondInvoiceTag = { label: getSpecialCharactersTagName() };
    testData.firstInvoiceTagName = `at_c6721_invoicetag_${getRandomPostfix()}`;
    testData.invoiceLineTagName = getSpecialCharactersTagName();

    cy.getAdminToken();
    cy.createTagApi(testData.existingTag).then((tagId) => {
      testData.existingTag.id = tagId;
    });
    cy.createTagApi(testData.secondInvoiceTag).then((tagId) => {
      testData.secondInvoiceTag.id = tagId;
    });
    Organizations.createOrganizationViaApi(testData.organization);
    Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
    }).then((invoice) => {
      testData.firstInvoice = invoice;
    });
    Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      tags: [testData.secondInvoiceTag.label],
    }).then((invoice) => {
      testData.secondInvoice = invoice;
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit, CapabilitySets.uiTagsManage],
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
    Invoices.deleteInvoiceViaApi(testData.firstInvoice.id);
    Invoices.deleteInvoiceViaApi(testData.secondInvoice.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    [testData.firstInvoiceTagName, testData.invoiceLineTagName].forEach((tagName) => {
      cy.getTagsApi({ query: `label=="${tagName}"`, limit: 1 }).then(({ body }) => {
        (body.tags || []).forEach(({ id }) => cy.deleteTagApi(id));
      });
    });
    cy.deleteTagApi(testData.existingTag.id);
    cy.deleteTagApi(testData.secondInvoiceTag.id);
  });

  it(
    'C6721 Add tags to an Invoice and Invoice line records and filter invoices and invoice lines by tags (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C6721'] },
    () => {
      // Step 1: Open Invoice #1 from Preconditions details pane
      Invoices.selectInvoiceByNumber(testData.firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({ title: testData.firstInvoice.vendorInvoiceNo });
      InvoiceView.verifyTagsCount(0);

      // Step 2: Click "Show tags" icon at the top right of "Vendor invoice number - <number>" pane
      InvoiceView.openTagsPane();
      TagsPane.verifyTagsPaneElements(0);

      // Step 3: Expand the dropdown in "Tags" pane and enter tag name
      TagsPane.fillInTagName(testData.firstInvoiceTagName);
      TagsPane.verifyAddTagOptionDisplayed(testData.firstInvoiceTagName);

      // Step 4: Click on "Add tag for: <entered value>" line below the text box
      TagsPane.clickAddTagOption(testData.firstInvoiceTagName);
      InteractorsTools.checkCalloutMessage(NEW_TAG_CREATED_MESSAGE);
      TagsPane.verifyTagsPaneElements(1, [testData.firstInvoiceTagName]);
      cy.wait(1000);
      InvoiceView.verifyTagsCount(1);

      // Step 5: Close "Tags" pane by clicking "X" button
      TagsPane.closeTagsPane();
      InvoiceView.verifyTagsCount(1);
      cy.wait(1000);

      // Step 6: Click "Show tags" icon at the top right of the invoice detail view
      InvoiceView.openTagsPane();
      TagsPane.verifyTagsPaneElements(1, [testData.firstInvoiceTagName]);

      // Step 7: Expand "Tags" dropdown and select any available value
      TagsPane.selectExistingTag(testData.existingTag.label);
      TagsPane.verifyTagOptionSelected(testData.existingTag.label);
      TagsPane.closeTagsDropdown();
      TagsPane.verifyTagsPaneElements(2, [
        testData.firstInvoiceTagName,
        testData.existingTag.label,
      ]);
      InvoiceView.verifyTagsCount(2);

      // Step 8: Click invoice line record in "Invoice lines" accordion on Invoice details pane
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.verifyTagsCount(0);

      // Step 9: Click "Show tags" icon at the top right of "View invoice line - <number>" pane
      InvoiceLineDetails.openTagsPane();
      TagsPane.verifyTagsPaneElements(0);

      // Step 10: Expand the dropdown in "Tags" pane and enter tag name containing only special characters
      TagsPane.fillInTagName(testData.invoiceLineTagName);
      TagsPane.verifyAddTagOptionDisplayed(testData.invoiceLineTagName);

      // Step 11: Click on "Add tag for: <entered value>" line below the text box
      TagsPane.clickAddTagOption(testData.invoiceLineTagName);
      InteractorsTools.checkCalloutMessage(NEW_TAG_CREATED_MESSAGE);
      TagsPane.verifyTagsPaneElements(1, [testData.invoiceLineTagName]);
      cy.wait(1000);
      InvoiceLineDetails.verifyTagsCount(1);

      // Step 12: Close "Tags" pane by clicking "X" button
      TagsPane.closeTagsPane();
      InvoiceLineDetails.verifyTagsCount(1);
      cy.wait(1000);

      // Step 13: Click "Show tags" icon at the top right of the invoice line detail view
      InvoiceLineDetails.openTagsPane();
      TagsPane.verifyTagsPaneElements(1, [testData.invoiceLineTagName]);

      // Step 14: Expand "Tags" dropdown and select any available value
      TagsPane.selectExistingTag(testData.existingTag.label);
      TagsPane.verifyTagOptionSelected(testData.existingTag.label);
      TagsPane.closeTagsDropdown();
      TagsPane.verifyTagsPaneElements(2, [testData.invoiceLineTagName, testData.existingTag.label]);
      InvoiceLineDetails.verifyTagsCount(2);

      // Step 15: Refresh the page, click "Reset all", filter by tag assigned to Invoice #2
      cy.reload();
      Invoices.waitLoading();
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();
      Invoices.filterByTags([testData.secondInvoiceTag.label]);
      Invoices.verifySearchResult(testData.secondInvoice.vendorInvoiceNo);

      // Step 16: Click "Reset all" button on "Search & filter" pane
      Invoices.resetFilters();
      Invoices.assertNoFiltersApplied();

      // Step 17: Filter by tag containing special characters assigned to the invoice line from Invoice #1
      Invoices.filterByTags([testData.invoiceLineTagName]);
      Invoices.verifySearchResult(testData.firstInvoice.vendorInvoiceNo);

      // Step 18: Click "Reset all", filter by existing tag assigned to Invoice #1
      Invoices.resetFilters();
      Invoices.filterByTags([testData.existingTag.label]);
      Invoices.verifySearchResult(testData.firstInvoice.vendorInvoiceNo);

      // Step 19: Additionally select tag assigned to Invoice #2
      Invoices.filterByTags([testData.secondInvoiceTag.label]);
      Invoices.checkSearchResultsContent({
        records: [
          { invoiceNumber: testData.secondInvoice.vendorInvoiceNo },
          { invoiceNumber: testData.firstInvoice.vendorInvoiceNo },
        ],
      });
    },
  );
});
