import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authority: {
          title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchInput: 'Twain, Mark',
          searchOption: 'Name-title',
          searchOption2: 'Keyword',
        },
        authority2: {
          searchInput: 'C350946 Gulf Stream C380553',
          searchOption: 'Geographic name',
        },
        authority3: {
          searchInput: 'C350911 Twain, Mark',
          searchOption: 'Name-title',
        },
        authorityPostfixes: [
          {
            type: 'authorized',
            postfix: '?authRefType=Authorized',
          },
          {
            type: 'reference',
            postfix:
              '?authRefType=Reference&headingRef=Twain%2C%20Mark%2C%201835-1910.%20Huckleberry%20Finn',
          },
          {
            type: 'auth/ref',
            postfix: '?authRefType=Auth%2FRef&headingRef=Twain%2C%20Mark%2C%201835-1910',
          },
        ],
        editedFields: [
          {
            rowIndex: 14,
            tag: '100',
            content: 'C350911 Twain, Mark - edited 100',
            value: 'C350911 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          },
          {
            rowIndex: 27,
            tag: '400',
            content: 'C350911 Twain, Mark - edited 400',
            value: String.raw`C350911 Twain, Mark, 1835-1910. Mark Twain's The adventures of Huckleberry Finn`,
          },
          { rowIndex: 29, tag: '500', content: 'C350911 Twain, Mark - edited 500' },
        ],
        editedGeographicNameField: {
          tag: '151',
          content: 'edited 151',
        },
      };

      const postfixC350909 = ' - C350909';
      const postfixC350911 = ' - C350911';
      const postfixC350946 = ' - C350946';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFiles = [
        {
          marc: 'marcAuthFileC350909.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
        },
        {
          marc: 'marcAuthFileForC350911.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
        },
        {
          marc: 'marcFileForC350946.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 2,
        },
      ];
      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
              (response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record.authority.id);
                });
              },
            );
            cy.wait(5000);
          });
        });

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

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C350909 Results List: Display updated and highlighted Heading/reference value at search result list after editing 1XX, 4XX, 5XX fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C350909'] },
        () => {
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchByParameter(
            testData.authority.searchOption2,
            testData.authority.searchInput,
          );
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.actionsSortBy('Authorized/Reference');
          MarcAuthorities.checkResultListSortedByColumn(1);
          cy.wait(3000);
          testData.editedFields.forEach(({ rowIndex, content }, index) => {
            MarcAuthorities.select(
              `${createdAuthorityIDs[0]}${testData.authorityPostfixes[index].postfix}`,
            );
            MarcAuthority.edit();
            QuickMarcEditor.updateExistingFieldContent(rowIndex, `$a ${content}${postfixC350909}`);
            MarcAuthority.clickSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            MarcAuthorities.checkRowUpdatedAndHighlighted(`${content}${postfixC350909}`);
          });
        },
      );

      it(
        'C350911 Results List: Display updated and highlighted Heading/reference value at browse result list after editing 1XX, 4XX, 5XX fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C350911'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.authority3.searchOption,
            testData.authority3.searchInput,
          );
          testData.editedFields.forEach(({ rowIndex, content, value }, index) => {
            if (index < 2) {
              MarcAuthorities.selectTitle(value);
              MarcAuthority.edit();
              QuickMarcEditor.updateExistingFieldContent(
                rowIndex,
                `$a ${content}${postfixC350911}`,
              );
              MarcAuthority.clickSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndCloseAuthority();
              MarcAuthorities.checkRowUpdatedAndHighlighted(`${content}${postfixC350911}`);
            }
          });
        },
      );

      it(
        'C350946 Verify that third pane still opened after editing first search result (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C350946'] },
        () => {
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchByParameter(
            testData.authority.searchOption2,
            testData.authority.searchInput,
          );
          MarcAuthorities.select(
            `${createdAuthorityIDs[0]}${testData.authorityPostfixes[0].postfix}`,
          );
          MarcAuthority.edit();
          MarcAuthority.changeField(
            testData.editedFields[0].tag,
            `$a ${testData.editedFields[0].content}${postfixC350946}`,
          );
          MarcAuthority.clickSaveAndCloseButton();
          MarcAuthority.contains(`${testData.editedFields[0].content}${postfixC350946}`);
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.authority2.searchOption,
            testData.authority2.searchInput,
          );
          MarcAuthorities.selectTitle(testData.authority2.searchInput);
          MarcAuthority.edit();
          MarcAuthority.changeField(
            testData.editedGeographicNameField.tag,
            `$a ${testData.editedGeographicNameField.content}`,
          );
          MarcAuthority.clickSaveAndCloseButton();
          MarcAuthority.contains(testData.editedGeographicNameField.content);
        },
      );
    });
  });
});
