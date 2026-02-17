import { Permissions } from '../../support/dictionary';
import { Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);
    });

    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353592 Verify if Accordion with validation errors fields remains expanded fields after "collapse all" command (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353592'] },
    () => {
      // Click "Actions" button on "Orders" pane and select "New" option
      const OrderEditForm = Orders.clickCreateNewOrder();
      OrderEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);
      OrderEditForm.checkOrderFormContent();

      // Fill in all the required fields except "Order type" field
      OrderEditForm.fillOrderFields({
        orderInfo: { organizationName: testData.organization.name },
      });
      OrderEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Expand "PO summary" accordion" accordion
      OrderEditForm.checkSectionsConditions([
        { sectionName: 'Purchase order', conditions: { expanded: true } },
        { sectionName: 'PO summary', conditions: { expanded: true } },
      ]);

      // Click "Collapse all" button
      OrderEditForm.cliskCollapseAllButton();
      OrderEditForm.checkSectionsConditions([
        { sectionName: 'Purchase order', conditions: { expanded: true } },
        { sectionName: 'PO summary', conditions: { expanded: false } },
      ]);

      // Click "Save & close" button
      OrderEditForm.clickSaveButton({ orderSaved: false });
      OrderEditForm.checkSectionsConditions([
        { sectionName: 'Purchase order', conditions: { expanded: true } },
        { sectionName: 'PO summary', conditions: { expanded: false } },
      ]);
      OrderEditForm.checkValidationError({ orderType: 'Required!' });
    },
  );
});
