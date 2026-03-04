import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import DateTools from '../../../../support/utils/dateTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const testData = {
        authorityHeading: `AT_C519984_MarcAuthority_${getRandomPostfix()}`,
        searchOption: 'Keyword',
        tag100: '100',
        tag199: '199',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        initialContent: '$a C519984 Test Authority',
        undefinedFieldContent: '$a Undefined 1XX field',
        updatedContent: '$a Undefined 1XX field $d date $e author',
        ldrRegExp: /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/,
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        userProperties: {},
        createdRecordId: null,
      };

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      const marcAuthorityFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let specId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C519984_MarcAuthority');

        cy.createTempUser(permissions).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getAuthoritySpec().then((spec) => {
            specId = spec.id;
            toggleAllUndefinedValidationRules(specId, { enable: true });
          });

          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

          // Create MARC authority record via API using MarcAuthorities helper
          MarcAuthorities.createMarcAuthorityViaAPI('n', '519984', marcAuthorityFields).then(
            (createdRecordId) => {
              testData.createdRecordId = createdRecordId;

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (testData.createdRecordId) {
          MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        }
        Users.deleteViaApi(testData.userProperties.userId);
        toggleAllUndefinedValidationRules(specId, { enable: false });
      });

      it(
        'C519984 Edit MARC authority record with undefined 1XX field and check "Version history" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C519984'] },
        () => {
          // Step 1: Search for the authority record and open it
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          // Step 2: Click on Action button > Edit
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(testData.tag100, including(testData.authorityHeading));

          // Step 3: Update existing 100 to undefined 199 field
          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag199);
          QuickMarcEditor.updateExistingField(testData.tag199, testData.undefinedFieldContent);

          // Step 4: Click "Save & keep close" button - should show warning
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(1, 0);

          // Verify warning message appears for field 199
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag199,
            including('Field is undefined'),
          );

          // Step 5: Click "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkContentByTag(testData.tag199, testData.undefinedFieldContent);

          // Step 6: Update 199 field with indicators and additional subfields
          QuickMarcEditor.updateExistingField(testData.tag199, testData.updatedContent);
          cy.wait(1000);
          QuickMarcEditor.updateIndicatorValue(testData.tag199, '2', 0);
          cy.wait(1000);
          QuickMarcEditor.updateIndicatorValue(testData.tag199, '3', 1);

          // Step 7: Click "Save & close" button (with validation warnings)
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.waitLoading();

          // Step 8: Open Version History
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Step 9: Verify Version History pane shows 3 versions (original + 2 edits)
          VersionHistorySection.verifyVersionHistoryPane(3);

          // Step 10: Verify first card (most recent update - index 0) changes
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 199',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Step 11: Verify second card (first edit - index 1) changes
          VersionHistorySection.verifyVersionHistoryCard(
            1,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            false,
          );
          VersionHistorySection.checkChangeForCard(
            1,
            'Field 199',
            VersionHistorySection.fieldActions.ADDED,
          );
          VersionHistorySection.checkChangeForCard(
            1,
            'Field 100',
            VersionHistorySection.fieldActions.REMOVED,
          );
          VersionHistorySection.checkChangeForCard(
            1,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Step 12: Open Changes modal for first card
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );

          // Step 13: Verify changes in modal - Field 199 edited
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            '199',
            '1  $a Undefined 1XX field',
            '23 $a Undefined 1XX field',
          );

          // Step 14: Verify modal has correct number of changes
          VersionHistorySection.checkChangesCountInModal(1);

          // Step 15: Close modal
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.waitLoading();

          // Step 16: Close Version History pane
          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();
        },
      );
    });
  });
});
