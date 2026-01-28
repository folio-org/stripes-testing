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
        authorityHeading: `AT_C375092_MarcAuthority_${randomPostfix}`,
        tag100: '100',
        tag400: '400',
        tag500: '500',
        tag511: '511',
        tag670: '670',
        headingFrom4XXField: `AT_C375092_Reference_Heading_${randomPostfix}`,
        headingFrom5XXField: `AT_C375092_AuthRef_Heading_${randomPostfix}`,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375092_MarcAuthority');
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
        'C375092 No additional records appear after user edits "5XX" MARC tag in MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375092'] },
        () => {
          MarcAuthorities.searchBeats(testData.headingFrom5XXField);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkResultList([testData.headingFrom5XXField]);
          MarcAuthorities.selectTitle(testData.headingFrom5XXField);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          QuickMarcEditor.updateExistingTagName(testData.tag500, testData.tag511);
          QuickMarcEditor.checkTagAbsent(testData.tag500);
          QuickMarcEditor.verifyTagValue(6, testData.tag511);

          cy.intercept(/\/search\/authorities\?.*AT_C375092_AuthRef/).as('getAuthorities');
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.tag511}\t`);

          cy.wait('@getAuthorities').its('response.statusCode').should('eq', 200);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkResultList([testData.headingFrom5XXField]);
        },
      );
    });
  });
});
