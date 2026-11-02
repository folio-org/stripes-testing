import CapabilitySets from '../../../support/dictionary/capabilitySets';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

// Fields that are expected to differ between the original template and its duplicate
const comparableTemplate = (template) => Cypress._.omit(template, ['id', 'templateName', 'metadata']);

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before(() => {
      const postfix = getRandomPostfix();

      testData = {
        orderTemplate: {
          templateName: `AT_C380768_OrderTemplate_${postfix}`,
          templateDescription: `AT_C380768_Description_${postfix}`,
          donorOrganizationIds: [],
          isPackage: false,
        },
        editedDescriptions: [1, 2, 3].map(
          (copyNumber) => `AT_C380768_EditedDescription_${copyNumber}_${postfix}`,
        ),
        cancelledDescription: `AT_C380768_CancelledDescription_${postfix}`,
        copyNames: [],
      };

      cy.getAdminToken();
      OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate)
        .then(() => OrderTemplates.getOrderTemplateByNameViaApi(testData.orderTemplate.templateName))
        .then((template) => {
          testData.orderTemplate = template;
        });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiOrdersSettingsOrderTemplatesCreate],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      testData.copyNames.forEach((copyName) => {
        OrderTemplates.getOrderTemplateByNameViaApi(copyName).then((template) => {
          if (template) {
            OrderTemplates.deleteOrderTemplateViaApi(template.id);
          }
        });
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C380768 Duplicate one order template several times and cancel duplicated order template creation (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C380768'] },
      () => {
        // Step 1: Click "Order templates" option on the second "Orders" pane
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.checkTemplateCreated(testData.orderTemplate.templateName);

        // Step 2: Click on one of the order templates
        OrderTemplates.selectTemplate(testData.orderTemplate.templateName);
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: false });

        // Step 3: Click "Expand all" button and note the template settings
        OrderTemplates.expandAll();
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: true });
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: 'Description', value: testData.orderTemplate.templateDescription }],
        });

        // Step 4: Click "Actions" -> "Duplicate"
        OrderTemplates.openDuplicateModal();
        OrderTemplates.verifyDuplicateModalContent();

        // Step 5: Click "Cancel" button
        OrderTemplates.cancelDuplicateModal();

        // Step 6: Click "Actions" -> "Duplicate" -> "Submit"
        OrderTemplates.openDuplicateModal();
        OrderTemplates.submitDuplicateModal();
        OrderTemplateForm.waitLoading();
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.orderTemplate.templateName);
        OrderTemplateForm.assertInfoSectionFields({
          templateCode: '',
          templateDescription: testData.orderTemplate.templateDescription,
        });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });
        OrderTemplateForm.getTemplateName().then((copyName) => {
          testData.copyNames.push(copyName);
          OrderTemplates.getOrderTemplateByNameViaApi(copyName).then((duplicatedTemplate) => {
            expect(comparableTemplate(duplicatedTemplate)).to.deep.equal(
              comparableTemplate(testData.orderTemplate),
            );
          });

          // Step 7: Edit "Description" field and click "Save"
          OrderTemplateForm.fillInfoSectionFields({
            templateDescription: testData.editedDescriptions[0],
          });
          OrderTemplateForm.clickSaveButton();
          OrderTemplates.waitLoading();
          OrderTemplates.checkTemplateCreated(copyName);

          // Step 8: Click on the created order template
          OrderTemplates.selectTemplate(copyName);
          OrderTemplates.expandAll();
          OrderTemplates.checkTemplateViewDetails({
            fields: [{ key: 'Description', value: testData.editedDescriptions[0] }],
          });
          OrderTemplates.closeTemplate();
          OrderTemplates.waitLoading();
        });

        // Step 9: Duplicate the original template again by repeating steps 2-7
        OrderTemplates.selectTemplate(testData.orderTemplate.templateName);
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: false });
        OrderTemplates.expandAll();
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: true });
        OrderTemplates.openDuplicateModal();
        OrderTemplates.verifyDuplicateModalContent();
        OrderTemplates.cancelDuplicateModal();
        OrderTemplates.openDuplicateModal();
        OrderTemplates.submitDuplicateModal();
        OrderTemplateForm.waitLoading();
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.orderTemplate.templateName);
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });
        OrderTemplateForm.getTemplateName().then((copyName) => {
          expect(testData.copyNames).to.not.include(copyName);
          testData.copyNames.push(copyName);
          OrderTemplates.getOrderTemplateByNameViaApi(copyName).then((duplicatedTemplate) => {
            expect(comparableTemplate(duplicatedTemplate)).to.deep.equal(
              comparableTemplate(testData.orderTemplate),
            );
          });

          OrderTemplateForm.fillInfoSectionFields({
            templateDescription: testData.editedDescriptions[1],
          });
          OrderTemplateForm.clickSaveButton();
          OrderTemplates.waitLoading();
          OrderTemplates.checkTemplateCreated(copyName);

          // Step 10: Click on the repeatedly created order template
          OrderTemplates.selectTemplate(copyName);
          OrderTemplates.expandAll();
          OrderTemplates.checkTemplateViewDetails({
            fields: [{ key: 'Description', value: testData.editedDescriptions[1] }],
          });
          OrderTemplates.closeTemplate();
          OrderTemplates.waitLoading();
        });

        // Step 11: Duplicate the original template again by repeating steps 2-7
        OrderTemplates.selectTemplate(testData.orderTemplate.templateName);
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: false });
        OrderTemplates.expandAll();
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: true });
        OrderTemplates.openDuplicateModal();
        OrderTemplates.verifyDuplicateModalContent();
        OrderTemplates.cancelDuplicateModal();
        OrderTemplates.openDuplicateModal();
        OrderTemplates.submitDuplicateModal();
        OrderTemplateForm.waitLoading();
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.orderTemplate.templateName);
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });
        OrderTemplateForm.getTemplateName().then((copyName) => {
          expect(testData.copyNames).to.not.include(copyName);
          testData.copyNames.push(copyName);
          OrderTemplates.getOrderTemplateByNameViaApi(copyName).then((duplicatedTemplate) => {
            expect(comparableTemplate(duplicatedTemplate)).to.deep.equal(
              comparableTemplate(testData.orderTemplate),
            );
          });

          OrderTemplateForm.fillInfoSectionFields({
            templateDescription: testData.editedDescriptions[2],
          });
          OrderTemplateForm.clickSaveButton();
          OrderTemplates.waitLoading();
          OrderTemplates.checkTemplateCreated(copyName);

          // Step 12: Click on the repeatedly created order template
          OrderTemplates.selectTemplate(copyName);
          OrderTemplates.expandAll();
          OrderTemplates.checkTemplateViewDetails({
            fields: [{ key: 'Description', value: testData.editedDescriptions[2] }],
          });

          // Step 13: Click "Actions" -> "Edit", edit "Description" and click "X"
          OrderTemplates.openEditForm();
          OrderTemplateForm.fillInfoSectionFields({
            templateDescription: testData.cancelledDescription,
          });
          OrderTemplateForm.closeForm(true);
          AreYouSureModal.verifyAreYouSureForm(true);

          // Step 14: Click "Keep editing" button
          AreYouSureModal.clickKeepEditingButton();
          AreYouSureModal.verifyAreYouSureForm(false);
          OrderTemplateForm.assertInfoSectionFields({
            templateDescription: testData.cancelledDescription,
          });

          // Step 15: Click "X" button
          OrderTemplateForm.closeForm(true);
          AreYouSureModal.verifyAreYouSureForm(true);

          // Step 16: Click "Close without saving" button
          AreYouSureModal.clickCloseWithoutSavingButton();
          AreYouSureModal.verifyAreYouSureForm(false);
          OrderTemplates.waitLoading();
          OrderTemplates.checkTemplateCreated(copyName);

          // Step 17: Click on the created order template
          OrderTemplates.selectTemplate(copyName);
          OrderTemplates.expandAll();
          OrderTemplates.checkTemplateViewDetails({
            fields: [{ key: 'Description', value: testData.editedDescriptions[2] }],
          });
        });
      },
    );
  });
});
