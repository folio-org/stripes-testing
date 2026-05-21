import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities, {
  defaultLDR,
} from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
  replaceByIndex,
} from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322595_List_${randomPostfix}`,
        authorityHeading: `AT_C1322595_MarcAuthority_${randomPostfix}`,
        // defaultLDR with pos 5 'n' replaced by 'd' (Deleted)
        ldrWithDeletedStatus: replaceByIndex(defaultLDR, 5, 'd'),
      };

      const authData = {
        prefix: getRandomLetters(10),
        startWithNumber: `1322595${randomNDigitNumber(6)}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordDelete,
      ];

      let userData = {};
      let authorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322595_');

        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          authData.startWithNumber,
          [{ tag: '100', content: `$a ${testData.authorityHeading}`, indicators: ['\\', '\\'] }],
          testData.ldrWithDeletedStatus,
        ).then((id) => {
          authorityId = id;

          cy.createTempUser([]).then((userProperties) => {
            userData = userProperties;
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322595 Build query to find MARC authority records which have Leader status = Deleted (d) but are not marked as Deleted in SRS (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322595'] },
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

          // Row 0: Heading contains test prefix — stays for all steps (isolation filter)
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.authorityHeading);

          // Add Row 1: MARC Authority — Leader record status equals 'd' — stays for all steps
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_LEADER_RECORD_STATUS, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield('d', 1);

          // Add Row 2: MARC Authority — State (operator/value changes per step)
          QueryModal.addNewRow(1);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.MARC_AUTHORITY_STATE, 2);

          // Step 2: Leader status = 'd' AND State not equal to 'DELETED' → record found
          // (record has LDR status = d and state is ACTUAL in SRS)
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 2);
          QueryModal.selectValueFromSelect('DELETED', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Leader status = 'd' AND State equals 'DELETED' → no records found
          // (record is not marked as Deleted in SRS)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 4: Leader status = 'd' AND State equals 'ACTUAL' → record found
          // (record has LDR status = d and state is ACTUAL in SRS)
          QueryModal.selectValueFromSelect('ACTUAL', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
        },
      );
    });
  });
});
