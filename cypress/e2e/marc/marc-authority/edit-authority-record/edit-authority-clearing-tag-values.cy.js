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
        authorityHeading: `AT_C375137_MarcAuthority_${getRandomPostfix()}`,
        tag100: '100',
        tag053: '053',
        tag370: '370',
        tag400: '400',
        tag500: '500',
        tag670: '670',
        tag952: '952',
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
        { tag: testData.tag053, content: '$a C375137 tag 053', indicators: ['\\', '\\'] },
        { tag: testData.tag370, content: '$a C375137 tag 370', indicators: ['\\', '\\'] },
        { tag: testData.tag400, content: '$a C375137 tag 400', indicators: ['\\', '\\'] },
        { tag: testData.tag500, content: '$a C375137 tag 500', indicators: ['\\', '\\'] },
        { tag: testData.tag670, content: '$a C375137 tag 670', indicators: ['\\', '\\'] },
        { tag: testData.tag952, content: '$a C375137 tag 952', indicators: ['\\', '\\'] },
      ];

      const fieldIndexes = {
        tag100: 4,
        tag053: 5,
        tag370: 6,
        tag400: 7,
        tag500: 8,
        tag670: 9,
        tag952: 10,
      };

      const tagsToClear = [
        testData.tag100,
        testData.tag053,
        testData.tag370,
        testData.tag400,
        testData.tag500,
        testData.tag670,
        testData.tag952,
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375137_MarcAuthority');
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
        'C375137 Tag value can be cleared for any field of "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375137'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.updateExistingField(testData.tag400, '$a');
          QuickMarcEditor.checkContentByTag(testData.tag400, '$a');
          tagsToClear.forEach((tag) => {
            QuickMarcEditor.updateExistingTagName(tag, '');
          });
          Object.values(fieldIndexes).forEach((fieldIndex) => {
            QuickMarcEditor.verifyTagValue(fieldIndex, '');
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(QuickMarcEditor.tag1XXNonRepeatableRequiredCalloutText);
          Object.entries(fieldIndexes).forEach(([key, fieldIndex]) => {
            if (key !== 'tag400') {
              QuickMarcEditor.checkErrorMessage(
                fieldIndex,
                QuickMarcEditor.tagLengthNumbersOnlyInlineErrorText,
              );
            } else {
              QuickMarcEditor.checkErrorMessage(
                fieldIndex,
                QuickMarcEditor.tagLengthNumbersOnlyInlineErrorText,
                false,
              );
            }
          });
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
