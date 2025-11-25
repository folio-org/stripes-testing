import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C423479_MarcAuthority_${randomPostfix}`,
        tagLDR: 'LDR',
        tag001: '001',
        tag005: '005',
        tag008: '008',
        tag100: '100',
        tag400: '400',
        tag500: '500',
        tag510: '510',
        tag511: '511',
        tag999: '999',
      };

      const authData = {
        prefix: getRandomLetters(20),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag400,
          content: '$a Test400',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag500,
          content: '$a Test500',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag510,
          content: '$a Test510',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag511,
          content: '$a Test511 A',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag511,
          content: '$a Test511 B',
          indicators: ['\\', '\\'],
        },
      ];

      const newFieldValues = {
        afterAddingFields: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        afterDeletingContent: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        afterFillingIndicators: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
        ],
      };

      const existingFieldValues = {
        afterClearingExisting: [{ tag: '', ind1: '', ind2: '', content: '' }],
        afterIndicatorsWithContent: [{ tag: '', ind1: '\\', ind2: '\\', content: '$a ' }],
        afterNumericIndicators: [{ tag: '', ind1: '2', ind2: '2', content: '$a ' }],
        afterKeepingTag: [{ tag: testData.tag511, ind1: '2', ind2: '2', content: '$a ' }],
        afterClearingTagContent: [{ tag: testData.tag511, ind1: '\\', ind2: '\\', content: '' }],
      };

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423479_MarcAuthority');
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
        'C423479 Fields without tag and subfield values are deleted during saving (edit MARC authority) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423479'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();

          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(9 + i);
          }
          cy.wait(1000);

          newFieldValues.afterAddingFields.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(10, '', '');
          newFieldValues.afterDeletingContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(11, '', '', '1', '2');
          newFieldValues.afterFillingIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(4, '', '', '', '');
          existingFieldValues.afterClearingExisting.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(5, '', '$a ', '\\', '\\');
          existingFieldValues.afterIndicatorsWithContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(6, '', '$a ', '2', '2');
          existingFieldValues.afterNumericIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              7 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(7, testData.tag511, '$a ', '2', '2');
          existingFieldValues.afterKeepingTag.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              8 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(8, testData.tag511, '', '\\', '\\');
          existingFieldValues.afterClearingTagContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              9 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkFieldsCount(6);
          [
            testData.tagLDR,
            testData.tag001,
            testData.tag005,
            testData.tag008,
            testData.tag100,
            testData.tag999,
          ].forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });
        },
      );
    });
  });
});
