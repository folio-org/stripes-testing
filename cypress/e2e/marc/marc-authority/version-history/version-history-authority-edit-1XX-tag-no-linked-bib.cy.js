import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C374147_Twain, Mark, 1835-1910. Adventures of Huckleberry Finn_${randomPostfix}`,
        searchOption: 'Keyword',
        tag100: '100',
        tag110: '110',
        tag111: '111',
        tag130: '130',
        tag150: '150',
        tag151: '151',
        tag155: '155',
        tag101: '101',
      };

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: '100',
          content: `$a Twain, Mark, $d 1835-1910. $t ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C374147*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C374147 Edit 1XX tag value in the "MARC authority" record which doesn\'t control "MARC Bib(s)" and check "Version history" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C374147'] },
        () => {
          // Steps 1-2: Search for the authority record
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
          // Step 3: Open the authority record
          MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          //   Step 4: Edit the authority record
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkTagExists(testData.tag100);

          // Step 5: Delete $t subfield and Save & Keep Editing
          QuickMarcEditor.updateExistingField(testData.tag100, '$a Twain, Mark, $d 1835-1910.');
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();

          // Step 6: Change tag from 100 to 110 and Save & Close
          cy.wait(1000);
          QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          QuickMarcEditor.closeAllCallouts();
          MarcAuthority.waitLoading();

          // Step 7: Check Version History - verify changes
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 110',
            VersionHistorySection.fieldActions.ADDED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 100',
            VersionHistorySection.fieldActions.REMOVED,
          );

          // Step 8: Open Changes Modal and verify details
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal();
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            testData.tag110,
            'No value set-',
            '1  $a Twain, Mark, $d 1835-1910.',
          );
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.REMOVED,
            testData.tag100,
            '1  $a Twain, Mark, $d 1835-1910.',
            'No value set-',
          );
          VersionHistorySection.closeChangesModal();

          // Step 9: Close Version History pane
          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();

          // Step 10-16: Edit again and change 110 to 111→130→150...→101
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkTagExists(testData.tag110);

          const tagSequence = [
            { from: testData.tag110, to: testData.tag111 },
            { from: testData.tag111, to: testData.tag130 },
            { from: testData.tag130, to: testData.tag150 },
            { from: testData.tag150, to: testData.tag151 },
            { from: testData.tag151, to: testData.tag155 },
            { from: testData.tag155, to: testData.tag101 },
          ];

          tagSequence.forEach(({ from, to }) => {
            cy.wait(1000);
            QuickMarcEditor.updateExistingTagName(from, to);
            QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.closeAllCallouts();
          });

          // Step 16-17: Change 155 to 101
          cy.wait(1000);
          QuickMarcEditor.updateExistingTagName(testData.tag101, testData.tag155);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.checkButtonsDisabled();

          // Step 18: Add $t subfield back
          QuickMarcEditor.updateExistingField(
            testData.tag155,
            '$a Twain, Mark, $d 1835-1910. $t test',
          );

          // Step 19: Save & Close and verify changes in the record
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityFields[0].content.split('$t')[0].trim());
        },
      );
    });
  });
});
