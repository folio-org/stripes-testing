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
      const randomDigits = `1292059${randomNDigitNumber(15)}`;
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1292059_List_${randomPostfix}`,
        authorityHeading1: `AT_C1292059_MarcAuthority_1_${randomPostfix}`,
        authorityHeading2: `AT_C1292059_MarcAuthority_2_${randomPostfix}`,
        // Record 1 identifiers (all 5 types)
        rec1Lccn: `nr${randomDigits}1`, // 010 $a → LCCN
        rec1CanceledLccn: `n${randomDigits}2`, // 010 $z → Canceled LCCN
        rec1OtherStdId: `${randomDigits}3`, // 024 $a → Other standard identifier
        rec1SystemControlNum: `${randomDigits}4`, // 035 $a → System control number
        // Record 2 identifiers (4 types, no System control number)
        rec2Lccn: `nr${randomDigits}5`, // 010 $a → LCCN
        rec2CanceledLccn: `n${randomDigits}6`, // 010 $z → Canceled LCCN
        rec2OtherStdId: `${randomDigits}7`, // 024 $a → Other standard identifier
      };

      const authData = {
        prefix: getRandomLetters(15),
      };

      const authorityFields1 = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading1}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '010',
          content: `$a ${testData.rec1Lccn} $z ${testData.rec1CanceledLccn}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '024',
          content: `$a ${testData.rec1OtherStdId} $2 iswc`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '035',
          content: `$a ${testData.rec1SystemControlNum}`,
          indicators: ['\\', '\\'],
        },
      ];

      const authorityFields2 = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading2}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '010',
          content: `$a ${testData.rec2Lccn} $z ${testData.rec2CanceledLccn}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '024',
          content: `$a ${testData.rec2OtherStdId} $2 istc`,
          indicators: ['\\', '\\'],
        },
      ];

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
      ];

      const identifierTypeOptions = [
        'Canceled LCCN',
        'Control number',
        'LCCN',
        'Other standard identifier',
        'System control number',
      ];

      let userData = {};
      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1292059_');

        MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, '1', authorityFields1).then(
          (id) => {
            createdAuthorityIds.push(id);
          },
        );

        MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, '2', authorityFields2).then(
          (id) => {
            createdAuthorityIds.push(id);
          },
        );

        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1292059 Build query using Authority — Identifier type, Identifier value fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1292059'] },
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

          // Step 2: Select Authority — Identifier type, any operator, verify Value dropdown options
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_IDENTIFIER_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(identifierTypeOptions);

          // Step 3: Identifier value equals {rec1Lccn} AND Identifier type equals LCCN → Record 1 found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_IDENTIFIER_VALUE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.rec1Lccn);
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_IDENTIFIER_TYPE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('LCCN', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Identifier value contains {rec2CanceledLccn} AND Identifier type equals Control number → Record 2 found
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.rec2CanceledLccn);
          QueryModal.chooseValueSelect('Control number', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Identifier value starts with {rec2OtherStdId} AND Identifier type not in System control number → Record 2 found
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(testData.rec2OtherStdId);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.chooseFromValueMultiselect('System control number', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 6: Identifier value contains {rec2OtherStdId} AND Identifier type in System control number → No records found
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedMultiselectValue('System control number', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();
        },
      );
    });
  });
});
