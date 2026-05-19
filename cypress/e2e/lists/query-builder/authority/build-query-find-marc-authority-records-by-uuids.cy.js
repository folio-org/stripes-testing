import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322606_List_${randomPostfix}`,
        authorityHeading1: `AT_C1322606_MarcAuthority_1_${randomPostfix}`,
        authorityHeading2: `AT_C1322606_MarcAuthority_2_${randomPostfix}`,
        authorityId1: null,
        authorityId2: null,
        subfieldS1: null,
        subfieldS2: null,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1322606',
      };

      const authorityFields1 = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading1}`,
          indicators: ['\\', '\\'],
        },
      ];

      const authorityFields2 = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading2}`,
          indicators: ['\\', '\\'],
        },
      ];

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
      ];

      let userData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322606_');

        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          authData.startWithNumber,
          authorityFields1,
        ).then((id) => {
          testData.authorityId1 = id;
          cy.getMarcRecordDataViaAPI(id).then((marcData) => {
            testData.subfieldS1 = marcData.parsedRecordId;
          });
        });

        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          +authData.startWithNumber + 1,
          authorityFields2,
        ).then((id) => {
          testData.authorityId2 = id;
          cy.getMarcRecordDataViaAPI(id).then((marcData) => {
            testData.subfieldS2 = marcData.parsedRecordId;
          });
        });

        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.authorityId1, true);
        MarcAuthority.deleteViaAPI(testData.authorityId2, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322606 Build query to find MARC authority records by UUIDs (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322606'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list, select Authority record type, open Build query
          Lists.openNewListPane();
          cy.wait(3000);
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Authority — UUID equals {authorityId1} → 1st record found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_UUID);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.authorityId1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Authority — UUID in {authorityId1},{authorityId2} → both records found
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${testData.authorityId1},${testData.authorityId2}`);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyResultFound(testData.authorityHeading2);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 4: Row 0: Authority — UUID equals {authorityId1}
          //         AND Row 1: MARC Authority — Matched UUID in {subfieldS1},{subfieldS2} → 1st record found
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.authorityId1);
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_MATCHED_UUID, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.fillInValueTextfield(`${testData.subfieldS1},${testData.subfieldS2}`, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Row 1: MARC Authority — Matched UUID not in {subfieldS1},{subfieldS2} → no records found
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 6: Row 1: MARC Authority — Matched UUID is null/empty False → 1st record found
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 7: Remove row 0, MARC Authority — Matched UUID equals {subfieldS2} → 2nd record found
          QueryModal.clickGarbage(0);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.subfieldS2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading2);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
        },
      );
    });
  });
});
