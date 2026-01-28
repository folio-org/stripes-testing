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
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C375091_MarcAuthority_${randomPostfix}`,
        tag100: '100',
        tag400: '400',
        tag410: '410',
        tag500: '500',
        tag670: '670',
        headingFrom4XXField: `AT_C375091_Reference_Heading_${randomPostfix}`,
        headingFrom5XXField: `AT_C375091_AuthRef_Heading_${randomPostfix}`,
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
        {
          tag: testData.tag400,
          content: `$a ${testData.headingFrom4XXField}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag500,
          content: `$a ${testData.headingFrom5XXField}`,
          indicators: ['\\', '\\'],
        },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375091_MarcAuthority');
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
        'C375091 No additional records appear after user edits "4XX" MARC tag in MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375091'] },
        () => {
          MarcAuthorities.searchBeats(testData.headingFrom4XXField);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkResultList([testData.headingFrom4XXField]);
          MarcAuthorities.selectTitle(testData.headingFrom4XXField);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.updateExistingTagName(testData.tag400, testData.tag410);
          QuickMarcEditor.checkTagAbsent(testData.tag400);
          QuickMarcEditor.verifyTagValue(5, testData.tag410);

          cy.intercept(/\/search\/authorities\?.*AT_C375091_Reference_Heading/).as(
            'getAuthorities',
          );
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.tag410}\t`);

          cy.wait('@getAuthorities').its('response.statusCode').should('eq', 200);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkResultList([testData.headingFrom4XXField]);
        },
      );
    });
  });
});
