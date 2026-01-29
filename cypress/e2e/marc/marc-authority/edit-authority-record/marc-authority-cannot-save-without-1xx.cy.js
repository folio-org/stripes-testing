import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        marcAuthorityHeading: `AT_C503063_MarcAuthority_${randomPostfix}`,
        errorRequired1XX: 'Field 1XX is non-repeatable and required.',
        searchOption: 'Keyword',
        prefix: '',
        startsWith: `3${randomFourDigitNumber()}${randomFourDigitNumber()}${randomFourDigitNumber()}`,
      };
      const authorityFields = [
        { tag: '100', content: `$a ${testData.marcAuthorityHeading}`, indicators: ['\\', '\\'] },
      ];

      let createdAuthorityId;

      before('Upload files', () => {
        cy.getAdminToken();
        // Create MARC authority record
        MarcAuthorities.createMarcAuthorityViaAPI(
          testData.prefix,
          testData.startsWith,
          authorityFields,
        ).then((createdRecordId) => {
          createdAuthorityId = createdRecordId;

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C503063 Cannot save "MARC authority" record without 1XX (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503063'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.marcAuthorityHeading);
          MarcAuthorities.select(createdAuthorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();

          // Step 2: Delete all values from 1XX except $a
          QuickMarcEditor.updateExistingField(authorityFields[0].tag, '$a');
          QuickMarcEditor.checkContentByTag(authorityFields[0].tag, '$a');

          // Step 3: Try to save, expect error
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorRequired1XX);
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.waitLoading();

          // Step 4: Delete $a from 1XX
          QuickMarcEditor.updateExistingField(authorityFields[0].tag, '');
          QuickMarcEditor.checkContentByTag(authorityFields[0].tag, '');

          // Step 5: Try to save, expect error again
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorRequired1XX);
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
