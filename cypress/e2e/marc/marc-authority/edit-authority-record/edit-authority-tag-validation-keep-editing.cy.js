import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityHeading: `AT_C360094_MarcAuthority_${getRandomPostfix()}`,
        tag100: '100',
        tag400: '400',
        field400Content: '$a Alternative, Name C360094',
        tag400Index: 5,
        invalidTagValues: ['', '45', '45e'],
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
        { tag: testData.tag400, content: testData.field400Content, indicators: ['\\', '\\'] },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C360094_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C360094 MARC tag validation checks when clicks on the "Save & keep editing" button in "Edit MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360094'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          testData.invalidTagValues.forEach((tagValue) => {
            QuickMarcEditor.updateExistingTagValue(testData.tag400Index, tagValue);
            QuickMarcEditor.verifyTagValue(testData.tag400Index, tagValue);
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.verifyValidationCallout(0, 1);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkErrorMessage(
              testData.tag400Index,
              QuickMarcEditor.tagLengthNumbersOnlyInlineErrorText,
            );
          });

          QuickMarcEditor.closeWithoutSavingAfterChange();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.tag400}\t`);
        },
      );
    });
  });
});
