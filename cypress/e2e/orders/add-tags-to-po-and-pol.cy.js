import { Permissions } from '../../support/dictionary';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const NEW_TAG_CREATED_MESSAGE = 'New tag created';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C6715_Organization_${getRandomPostfix()}`,
    };
    testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      title: `AT_C6715_OrderLine_${getRandomPostfix()}`,
    });
    testData.existingTag = { label: `at_c6715_existingtag_${getRandomPostfix()}`.toLowerCase() };
    testData.poTagName = `at_c6715_potag_${getRandomPostfix()}`.toLowerCase();
    testData.polTagName = `at_c6715_poltag_${getRandomPostfix()}`.toLowerCase();

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.createTagApi(testData.existingTag).then((tagId) => {
      testData.existingTag.id = tagId;
    });
    Organizations.createOrganizationViaApi(testData.organization);
    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiTagsPermissionAll.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    [testData.poTagName, testData.polTagName].forEach((tagName) => {
      cy.getTagsApi({ query: `label=="${tagName}"`, limit: 1 }).then(({ body }) => {
        (body.tags || []).forEach(({ id }) => cy.deleteTagApi(id));
      });
    });
    cy.deleteTagApi(testData.existingTag.id);
  });

  it(
    'C6715 Add tags to a PO and POL record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C6715'] },
    () => {
      // Step 1: Go to the Orders app, open Order from Preconditions details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.verifyTagsCount(0);

      // Step 2: Click "Show tags" icon at the top right of "Purchase order" pane
      OrderDetails.openTagsPane();
      OrderDetails.verifyTagsPaneElements(0);

      // Step 3: Expand the dropdown in "Tags" pane and enter tag name
      OrderDetails.fillInTagName(testData.poTagName);
      OrderDetails.verifyAddTagOptionDisplayed(testData.poTagName);

      // Step 4: Click on "Add tag for: <entered value>" line below the text box
      OrderDetails.clickAddTagOption(testData.poTagName);
      InteractorsTools.checkCalloutMessage(NEW_TAG_CREATED_MESSAGE);
      OrderDetails.verifyTagsPaneElements(1, [testData.poTagName]);
      cy.wait(1000);
      OrderDetails.verifyTagsCount(1);

      // Step 5: Close "Tags" pane by clicking "X" button
      OrderDetails.closeTagsPane();
      OrderDetails.verifyTagsCount(1);
      cy.wait(1000);

      // Step 6: Click "Show tags" icon at the top right of the order's detail view
      OrderDetails.openTagsPane();
      OrderDetails.verifyTagsPaneElements(1, [testData.poTagName]);

      // Step 7: Expand "Tags" dropdown and select any available value
      OrderDetails.selectExistingTag(testData.existingTag.label);
      OrderDetails.verifyTagOptionSelected(testData.existingTag.label);
      OrderDetails.closeTagsDropdown();
      OrderDetails.verifyTagsPaneElements(2, [testData.poTagName, testData.existingTag.label]);
      OrderDetails.verifyTagsCount(2);

      // Step 8: Click PO line record in "PO lines" accordion on "Purchase order" pane
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.verifyTagsCount(0);

      // Step 9: Click "Show tags" icon at the top right of "PO Line details" pane
      OrderLineDetails.openTagsPane();
      OrderLineDetails.verifyTagsPaneElements(0);

      // Step 10: Expand the dropdown in "Tags" pane and enter tag name
      OrderLineDetails.fillInTagName(testData.polTagName);
      OrderLineDetails.verifyAddTagOptionDisplayed(testData.polTagName);

      // Step 11: Click on "Add tag for: <entered value>" line below the text box
      OrderLineDetails.clickAddTagOption(testData.polTagName);
      InteractorsTools.checkCalloutMessage(NEW_TAG_CREATED_MESSAGE);
      OrderLineDetails.verifyTagsPaneElements(1, [testData.polTagName]);
      OrderLineDetails.verifyTagsCount(1);

      // Step 12: Close "Tags" pane by clicking "X" button
      OrderLineDetails.closeTagsPane();
      OrderLineDetails.verifyTagsCount(1);

      // Step 13: Click "Show tags" icon at the top right of the PO line detail view
      OrderLineDetails.openTagsPane();
      OrderLineDetails.verifyTagsPaneElements(1, [testData.polTagName]);

      // Step 14: Expand "Tags" dropdown and select any available value
      OrderLineDetails.selectExistingTag(testData.existingTag.label);
      OrderLineDetails.verifyTagOptionSelected(testData.existingTag.label);
      OrderLineDetails.closeTagsDropdown();
      OrderLineDetails.verifyTagsPaneElements(2, [testData.polTagName, testData.existingTag.label]);
      OrderLineDetails.verifyTagsCount(2);
    },
  );
});
