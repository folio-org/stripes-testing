import { Permissions } from '../../support/dictionary';
import { Behavior, General, OaiPmh, Technical } from '../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_MESSAGES } from '../../support/fragments/settings/oai-pmh/behavior';
import { GENERAL_MESSAGES } from '../../support/fragments/settings/oai-pmh/general';
import { TECHNICAL_MESSAGES } from '../../support/fragments/settings/oai-pmh/technical';
import { SECTIONS } from '../../support/fragments/settings/oai-pmh/oaipmhPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

let user;

describe('OAI-PMH', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.oaipmhSettingsEdit.gui]).then((userProperties) => {
      user = userProperties;

      General.updateOaiServiceAvailabilityViaApi(false);

      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
      });
    });
  });

  after('Delete test data and restore OAI service', () => {
    cy.getAdminToken();
    General.updateOaiServiceAvailabilityViaApi(true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C1273159 OAI-PMH settings when service is disabled (firebird)',
    { tags: ['extendedPath', 'firebird', 'C1273159', 'nonParallel'] },
    () => {
      // Step 1: Click "General" option on the "OAI-PMH" pane
      OaiPmh.selectSection(SECTIONS.GENERAL);
      General.verifyWarningBanner(GENERAL_MESSAGES.WARNING_BANNER_DISABLED);
      General.verifyCheckEnableOaiServiceCheckbox(true, false);
      General.verifyGeneralPaneWhenDisabled();
      General.verifySaveButton(true);

      // Step 2: Hover over disabled fields and verify tooltips
      General.hoverAndVerifyTooltip('Repository name', GENERAL_MESSAGES.TOOLTIP_DISABLED);
      General.hoverAndVerifyTooltip('Base URL', GENERAL_MESSAGES.TOOLTIP_DISABLED);
      General.hoverAndVerifyTooltip('Time granularity', GENERAL_MESSAGES.TOOLTIP_DISABLED);
      General.hoverAndVerifyTooltip('Administrator email(s)', GENERAL_MESSAGES.TOOLTIP_DISABLED);

      // Step 3: Hover over "Enable OAI service" checkbox
      General.hoverAndVerifyTooltip(
        'Enable OAI service',
        GENERAL_MESSAGES.TOOLTIP_ENABLE_OAI_SERVICE,
      );

      // Step 4: Click "Technical" on "OAI-PMH" pane
      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      Technical.verifyWarningBanner(TECHNICAL_MESSAGES.WARNING_BANNER_DISABLED);
      Technical.verifyTechnicalPaneWhenDisabled();

      // Step 5: Hover over disabled fields and verify tooltips
      Technical.hoverAndVerifyTooltip(
        'Max records per response',
        TECHNICAL_MESSAGES.TOOLTIP_DISABLED,
      );
      Technical.hoverCheckboxesAndVerifyTooltip(
        'Enable validation',
        true,
        TECHNICAL_MESSAGES.TOOLTIP_DISABLED,
      );
      Technical.hoverCheckboxesAndVerifyTooltip(
        'Formatted output',
        true,
        TECHNICAL_MESSAGES.TOOLTIP_DISABLED,
      );

      // Step 6: Click "Behavior" on "OAI-PMH" pane
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyWarningBanner(BEHAVIOR_MESSAGES.WARNING_BANNER_DISABLED);
      Behavior.verifyBehaviorPaneWhenDisabled();

      // Step 7: Hover over disabled fields and verify tooltips
      Behavior.hoverAndVerifyTooltip('Deleted records support', BEHAVIOR_MESSAGES.TOOLTIP_DISABLED);
      Behavior.hoverAndVerifyTooltip(
        'Suppressed records processing',
        BEHAVIOR_MESSAGES.TOOLTIP_DISABLED,
      );
      Behavior.hoverAndVerifyTooltip(
        'OAI-PMH errors processing',
        BEHAVIOR_MESSAGES.TOOLTIP_DISABLED,
      );
      Behavior.hoverAndVerifyTooltip('Record source', BEHAVIOR_MESSAGES.TOOLTIP_DISABLED);

      // Step 8: Click "General" and check "Enable OAI service" checkbox
      OaiPmh.selectSection(SECTIONS.GENERAL);
      General.checkEnableOaiServiceCheckbox();
      General.verifyCheckEnableOaiServiceCheckbox(true, true);
      General.verifyWarningBanner(GENERAL_MESSAGES.WARNING_BANNER_DISABLED);
      General.verifyGeneralPaneWhenDisabled();
      General.verifySaveButton(false);

      // Step 9: Click "Save" button
      General.clickSaveButton();
      InteractorsTools.checkCalloutMessage(GENERAL_MESSAGES.CALLOUT_SUCCESS);

      // Step 10: Verify elements on the "General" pane
      General.verifyWarningBanner();
      General.verifyGeneralPaneWhenEnabled();

      // Step 11: Hover over fields and verify tooltips
      General.hoverAndVerifyTooltip(
        'Enable OAI service',
        GENERAL_MESSAGES.TOOLTIP_ENABLE_OAI_SERVICE,
      );
      General.hoverAndVerifyTooltip('Repository name*', GENERAL_MESSAGES.TOOLTIP_REPOSITORY_NAME);
      General.hoverAndVerifyTooltip('Base URL*', GENERAL_MESSAGES.TOOLTIP_BASE_URL);
      General.hoverAndVerifyTooltip('Time granularity', GENERAL_MESSAGES.TOOLTIP_TIME_GRANULARITY);
      General.hoverAndVerifyTooltip(
        'Administrator email(s)*',
        GENERAL_MESSAGES.TOOLTIP_ADMIN_EMAILS,
      );

      // Step 12: Click "Technical" on "OAI-PMH" pane
      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      Technical.verifyWarningBanner();
      Technical.verifyTechnicalPaneWhenEnabled();

      // Step 13: Hover over fields and verify tooltips
      Technical.hoverAndVerifyTooltip(
        'Max records per response*',
        TECHNICAL_MESSAGES.TOOLTIP_MAX_RECORDS,
      );
      Technical.hoverCheckboxesAndVerifyTooltip(
        'Enable validation',
        false,
        TECHNICAL_MESSAGES.TOOLTIP_ENABLE_VALIDATION,
      );
      Technical.hoverCheckboxesAndVerifyTooltip(
        'Formatted output',
        false,
        TECHNICAL_MESSAGES.TOOLTIP_FORMATTED_OUTPUT,
      );

      // Step 14: Click "Behavior" on "OAI-PMH" pane
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyWarningBanner();
      Behavior.verifyBehaviorPaneWhenEnabled();

      // Step 15: Hover over fields and verify tooltips
      Behavior.hoverAndVerifyTooltip(
        'Deleted records support*',
        BEHAVIOR_MESSAGES.TOOLTIP_DELETED_RECORDS,
      );
      Behavior.hoverAndVerifyTooltip(
        'Suppressed records processing*',
        BEHAVIOR_MESSAGES.TOOLTIP_SUPPRESSED_RECORDS,
      );
      Behavior.hoverAndVerifyTooltip(
        'OAI-PMH errors processing*',
        BEHAVIOR_MESSAGES.TOOLTIP_OAI_PMH_ERRORS,
      );
      Behavior.hoverAndVerifyTooltip('Record source*', BEHAVIOR_MESSAGES.TOOLTIP_RECORD_SOURCE);
    },
  );
});
