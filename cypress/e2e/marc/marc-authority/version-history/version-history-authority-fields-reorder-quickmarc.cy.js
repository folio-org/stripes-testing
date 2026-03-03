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
        authorityHeading: `AT_C407739_MarcAuthority_${randomPostfix}`,
        initialVersionsCount: null,
        initialFieldOrder: [
          'LDR',
          '001',
          '005',
          '008',
          '002',
          '003',
          '004',
          '009',
          '010',
          '040',
          '130',
          '375',
          '430',
          '530',
          '670',
          '999',
        ],
        expectedFieldOrder: [
          'LDR',
          '999',
          '670',
          '530',
          '430',
          '375',
          '130',
          '040',
          '010',
          '009',
          '004',
          '003',
          '002',
          '008',
          '005',
          '001',
        ],
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
          tag: '002',
          content: '$a test002',
        },
        {
          tag: '003',
          content: 'test003',
        },
        {
          tag: '004',
          content: 'test004',
        },
        {
          tag: '009',
          content: 'test009',
        },
        {
          tag: '010',
          content: '$a test010',
        },
        {
          tag: '040',
          content: '$a test040',
        },
        {
          tag: '130',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '375',
          content: '$a test375',
        },
        {
          tag: '430',
          content: '$a test430',
          indicators: ['\\', '\\'],
        },
        {
          tag: '530',
          content: '$a test530',
          indicators: ['\\', '\\'],
        },
        {
          tag: '670',
          content: '$a test670',
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407739*');

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
            MarcAuthorities.searchBy('Keyword', testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C407739 Verify that all fields (except "LDR") can be moved and saved when editing "MARC authority" record and check "Version history" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C407739'] },
        () => {
          MarcAuthority.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.getVersionHistoryValue().then((versionsCount) => {
            testData.initialVersionsCount = versionsCount;
          });
          VersionHistorySection.clickCloseButton();

          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          testData.initialFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.verifyEditableFieldIcons(1, false, true, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(15, true, false, false);

          for (let movesCount = 14; movesCount >= 1; movesCount--) {
            for (let i = 0; i < movesCount; i++) {
              QuickMarcEditor.moveFieldUp(15 - i);
            }
          }

          testData.expectedFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          testData.expectedFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.verifyEditableFieldIcons(1, false, true, false, true);
          QuickMarcEditor.verifyEditableFieldIcons(15, true, false, false, false);

          QuickMarcEditor.closeAuthorityEditorPane();

          MarcAuthority.waitLoading();
          MarcAuthority.checkTagInRow(0, 'LEADER');
          testData.expectedFieldOrder.slice(1).forEach((tag, index) => {
            MarcAuthority.checkTagInRow(index + 1, tag);
          });

          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.getVersionHistoryValue().then((versionsCount) => {
            expect(versionsCount).to.equal(testData.initialVersionsCount);
          });
        },
      );
    });
  });
});
