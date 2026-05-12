import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag100: '100',
        recordType: 'Authority',
        listName: `AT_C1292061_List_${randomPostfix}`,
        authorityHeadingPrefix: `AT_C1292061_MarcAuthority_${randomPostfix}`,
      };

      const authorityHeadings = {
        notDeleted: `${testData.authorityHeadingPrefix}_1`,
        deleted: `${testData.authorityHeadingPrefix}_2`,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWith: `1292061${randomNDigitNumber(6)}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordDelete,
      ];

      let userData = {};
      let existingAuthorityId;
      let deletedAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1292061 MARC authority record');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startsWith, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.notDeleted}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            existingAuthorityId = id;
          });

          MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, +authData.startsWith + 1, [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings.deleted}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            deletedAuthorityId = id;
          });

          cy.createTempUser([]).then((userProperties) => {
            userData = userProperties;
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
          });
        }).then(() => {
          MarcAuthority.deleteViaAPI(deletedAuthorityId);
          cy.recurse(
            () => MarcAuthorities.getMarcAuthoritiesViaApi({
              query: `keyword="${authorityHeadings.deleted}" and authRefType=="Authorized"`,
            }),
            (foundAuthorities) => foundAuthorities.length === 0,
            { limit: 10, timeout: 12000, delay: 1000 },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(existingAuthorityId, true);
        MarcAuthority.deleteViaAPI(deletedAuthorityId, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1292061 Verify that deleted MARC authority records do not appear in query results (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1292061'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list, select Authority record type, open Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Configure query by heading "starts with", verify only not-deleted record is found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.populateFiled('input', testData.authorityHeadingPrefix);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Configure query by UUID of deleted record, verify no records found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_UUID);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.populateFiled('input', deletedAuthorityId);
          QueryModal.testQuery();
          QueryModal.verifyQueryReturnsNoResults();

          // Step 4: Configure query by UUID of not-deleted record, verify 1 record found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_UUID);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.populateFiled('input', existingAuthorityId);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
        },
      );
    });
  });
});
