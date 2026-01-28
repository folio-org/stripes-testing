import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityHeading: `AT_C514996_MarcAuthority_${getRandomPostfix()}`,
        tags: {
          tag100: '100',
          tag988: '988',
        },
        newFieldContent: 'Some content for new field 988',
        expectedWarning: 'Warn: Field is undefined.',
        userProperties: {},
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tags.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514996_MarcAuthority');
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
        'C514996 Edit MARC authority record with field which is not defined in validation rules and check "Last updated" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514996'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.addNewField(testData.tags.tag988, testData.newFieldContent, 4);
          QuickMarcEditor.verifyTagValue(5, testData.tags.tag988);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
          MarcAuthority.contains(`Last updated: ${updatedDate}`);

          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(2);
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            updatedDate,
            undefined,
            undefined,
            false,
            true,
          );
        },
      );
    });
  });
});
