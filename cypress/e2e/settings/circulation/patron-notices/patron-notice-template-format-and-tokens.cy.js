import Permissions from '../../../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notice templates)', () => {
    const testData = {};
    const tokenPreviewTemplateName = `AT_C1453637_ItemTitleShort_${getRandomPostfix()}`;
    const itemTitle = 'The Wines of Italy: A Comprehensive Guide to Regional Varietals';
    const itemTitleShort = 'The Wines of Italy: A Com';

    before('Create test user', () => {
      return cy.getAdminToken().then(() => {
        return cy
          .createTempUser([Permissions.uiCirculationSettingsNoticeTemplates.gui])
          .then((userProperties) => {
            testData.user = userProperties;
          });
      });
    });

    beforeEach('Log in', () => {
      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.circulationPatronNoticeTemplatesPath,
          waiter: NewNoticePolicyTemplate.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      return cy.getAdminToken().then(() => Users.deleteViaApi(testData.user.userId));
    });

    it(
      'C1453636 - item.titleShort token appears in Item section of Add token modal below item.title and above item.primaryContributor',
      { tags: ['extendedPath', 'helios', 'C1453636'] },
      () => {
        // Step 1: Open Patron notice templates
        NewNoticePolicyTemplate.verifyTemplatesListPane();

        // Step 2: Open a new template and open the Add token modal
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.verifyNewTemplateForm();
        NewNoticePolicyTemplate.expandTemplateAccordion('Patron notice content');
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.openAddTokenModal();

        // Step 3: Verify the Item token list is visible
        NewNoticePolicyTemplate.verifyTokenCategory('Item');

        // Step 4: Verify item.titleShort is between item.title and item.primaryContributor
        NewNoticePolicyTemplate.verifyItemTokenOrder();
        NewNoticePolicyTemplate.closeAddTokenModal();
      },
    );

    it(
      'C1453637 - item.titleShort token preview resolves to first 25 characters of item title',
      { tags: ['extendedPath', 'helios', 'C1453637'] },
      () => {
        // Step 1: Open Patron notice templates
        NewNoticePolicyTemplate.verifyTemplatesListPane();

        // Step 2: Open a new template, set its name and category, and enable its content editor
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.verifyNewTemplateForm();
        NewNoticePolicyTemplate.expandTemplateAccordion('General information');
        NewNoticePolicyTemplate.fillTemplateName(tokenPreviewTemplateName);
        NewNoticePolicyTemplate.selectTemplateCategory(NOTICE_CATEGORIES.loan.name);
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.expandTemplateAccordion('Patron notice content');

        // Step 3: Add item.titleShort to the Body field
        NewNoticePolicyTemplate.addTokenFromCategory('item.titleShort', 'Item');

        // Step 4: Add item.title to the Body field
        NewNoticePolicyTemplate.addTokenFromCategory('item.title', 'Item');

        // Step 5: Verify the preview resolves the full title and its first 25 characters
        NewNoticePolicyTemplate.checkPreviewIncludes([itemTitleShort, itemTitle]);
      },
    );
  });
});
