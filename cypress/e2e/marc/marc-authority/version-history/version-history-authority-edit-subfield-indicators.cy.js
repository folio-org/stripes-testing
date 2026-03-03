import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const testData = {
        authorityHeading: 'AT_C663325_Elizabeth II, Queen of Great Britain, 1926-',
        searchOption: 'Keyword',
        tag100: '100',
        originalContent: '$a AT_C663325_Elizabeth $b II, $c Queen of Great Britain, $d 1926-',
        updatedContent: '$a Elizabeth $b II, $e Queen of Great Britain, $p 1926-',
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
          content: '$a AT_C663325_Elizabeth $b II, $c Queen of Great Britain, $d 1926-',
          indicators: ['0', '\\'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663325*');

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
        'C663325 Check "Version history" pane after Update of subfield indicator in "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663325'] },
        () => {
          // Step 1: Search for the authority record
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
          MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          // Step 2: Edit the authority record
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkTagExists(testData.tag100);

          // Step 3: Update subfield indicators ($c → $e, $d → $p) and Save & Close
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedContent);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.waitLoading();

          // Step 4: Open Version History
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Step 5: Verify Field 100 was edited
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 100',
            VersionHistorySection.fieldActions.EDITED,
          );

          // Step 6: Open Changes Modal
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal();

          // Step 7: Verify changes in modal with indicators
          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            testData.tag100,
            `0  ${testData.originalContent}`,
            `0  ${testData.updatedContent}`,
          );

          // Step 8: Close modal and version history pane
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();
        },
      );
    });
  });
});
