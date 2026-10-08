import Permissions from '../../../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notice templates)', () => {
    const testData = {};
    const tokenPreviewTemplateName = `AT_C1453637_ItemTitleShort_${getRandomPostfix()}`;
    const savedTemplate = {
      name: `AT_C1444210_NoticeFormat_${getRandomPostfix()}`,
      noticeFormat: 'Email',
      subject: `AT_C1444210_Subject_${getRandomPostfix()}`,
      body: `AT_C1444210_Body_${getRandomPostfix()}`,
    };
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
      return cy
        .getAdminToken()
        .then(() => NewNoticePolicyTemplate.deleteNoticePolicyTemplateByNameViaAPI(savedTemplate.name))
        .then(() => Users.deleteViaApi(testData.user.userId));
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

    it(
      'C1444209 - New patron notice template form displays Patron notice content accordion with all required elements',
      { tags: ['extendedPath', 'helios', 'C1444209'] },
      () => {
        // Step 1: Verify the New button label in the Patron notice templates pane
        NewNoticePolicyTemplate.verifyNewButtonLabel();

        // Step 2: Open the new template form and verify both accordions
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.verifyNewTemplateForm();
        NewNoticePolicyTemplate.expandTemplateAccordion('General information');

        // Step 3: Verify the required General information fields
        NewNoticePolicyTemplate.verifyGeneralInformationFields();

        // Step 4: Verify Patron notice content is the second accordion
        NewNoticePolicyTemplate.verifyNoticeContentAccordionIsSecond();
        NewNoticePolicyTemplate.expandTemplateAccordion('Patron notice content');

        // Step 5: Verify the initial Notice format field and help icon
        NewNoticePolicyTemplate.verifyInitialNoticeFormatField();

        // Step 6: Verify Subject and Body start disabled with help icons; Body becomes required when enabled
        NewNoticePolicyTemplate.verifyInitialNoticeContentFields();
        NewNoticePolicyTemplate.verifyBodyRequiredIndicator(false);

        // Step 7: Select a format and verify Body is enabled and marked as required
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.verifyBodyRichTextEditorEnabled();
        NewNoticePolicyTemplate.verifyBodyRequiredIndicator();

        // Step 8: Verify Preview is above the right side of the Body editor
        NewNoticePolicyTemplate.verifyPreviewButtonAboveBody();

        // Step 9: Verify the footer actions are visible below the Body editor
        NewNoticePolicyTemplate.verifyFormFooterButtonsBelowBody();
      },
    );

    it(
      'C1444210 - Notice format selection enables and disables Subject and Body fields in patron notice template',
      { tags: ['criticalPath', 'helios', 'C1444210'] },
      () => {
        // Set up the New patron notice template form required by the case precondition
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.verifyNewTemplateForm();
        NewNoticePolicyTemplate.expandTemplateAccordion('Patron notice content');

        // Step 1: Verify the Notice format dropdown choices
        NewNoticePolicyTemplate.verifyNoticeFormatOptions();

        // Step 2: Select Email and verify Subject and Body are enabled
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.verifySubjectEnabled();
        NewNoticePolicyTemplate.verifyBodyRichTextEditorEnabled();

        // Step 3: Select Print only and verify Subject is disabled while Body stays enabled
        NewNoticePolicyTemplate.selectNoticeFormat('Print only');
        NewNoticePolicyTemplate.verifySubjectDisabled();
        NewNoticePolicyTemplate.verifyBodyRichTextEditorEnabled();

        // Step 4: Select Text message and verify Subject is disabled while Body stays enabled
        NewNoticePolicyTemplate.selectNoticeFormat('Text message');
        NewNoticePolicyTemplate.verifySubjectDisabled();
        NewNoticePolicyTemplate.verifyBodyTextAreaEnabled();

        // Step 5: Select Email again and verify Subject is enabled
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.verifySubjectEnabled();

        // Step 6: Enter Subject and Body text and verify the footer actions
        NewNoticePolicyTemplate.fillSubjectAndBody(savedTemplate);
        NewNoticePolicyTemplate.verifyFormFooterButtonsBelowBody();

        // Step 7: Save a named template and verify the success toast and detail pane
        NewNoticePolicyTemplate.expandTemplateAccordion('General information');
        NewNoticePolicyTemplate.fillTemplateName(savedTemplate.name);
        NewNoticePolicyTemplate.selectTemplateCategory(NOTICE_CATEGORIES.loan.name);
        NewNoticePolicyTemplate.saveAndClose();
        InteractorsTools.checkCalloutMessage(
          `The Patron notice templates ${savedTemplate.name} was successfully created.`,
        );
        NewNoticePolicyTemplate.verifyTemplateInListAndDetail(savedTemplate.name);

        // Step 8: Open the saved template and verify its Notice format, Subject, and Body
        NewNoticePolicyTemplate.openTemplateByName(savedTemplate.name);
        NewNoticePolicyTemplate.verifySavedTemplateDetails(savedTemplate);
      },
    );

    it(
      'C1444211 - Patron notice template InfoPopovers display correct help text for Notice format, Subject, and Body fields',
      { tags: ['extendedPath', 'helios', 'C1444211'] },
      () => {
        // Set up the New template form required by the case precondition
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.verifyNewTemplateForm();
        NewNoticePolicyTemplate.expandTemplateAccordion('Patron notice content');
        NewNoticePolicyTemplate.verifyInitialNoticeContentFields();
        NewNoticePolicyTemplate.verifyInitialNoticeFormatField();

        // Step 1: Verify the Notice format InfoPopover text
        NewNoticePolicyTemplate.clickNoticeFormatInfoButton();
        NewNoticePolicyTemplate.verifyInfoPopover(
          NewNoticePolicyTemplate.getInfoPopoverMessage('noticeFormat'),
        );

        // Step 2: Verify the disabled Subject InfoPopover text
        NewNoticePolicyTemplate.clickSubjectInfoButton();
        NewNoticePolicyTemplate.verifyInfoPopover(
          NewNoticePolicyTemplate.getInfoPopoverMessage('subject'),
        );

        // Step 3: Verify the disabled Body InfoPopover text
        NewNoticePolicyTemplate.clickBodyInfoButton();
        NewNoticePolicyTemplate.verifyInfoPopover(
          NewNoticePolicyTemplate.getInfoPopoverMessage('body'),
        );

        // Step 4: Select Email and verify the Notice format help text remains unchanged
        NewNoticePolicyTemplate.selectNoticeFormat('Email');
        NewNoticePolicyTemplate.clickNoticeFormatInfoButton();
        NewNoticePolicyTemplate.verifyInfoPopover(
          NewNoticePolicyTemplate.getInfoPopoverMessage('noticeFormat'),
        );
      },
    );
  });
});
