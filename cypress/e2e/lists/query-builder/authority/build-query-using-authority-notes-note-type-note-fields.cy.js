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
        listName: `AT_C1292063_List_${randomPostfix}`,
        authorityHeading1: `AT_C1292063_MarcAuthority_${randomPostfix}_1`,
        authorityHeading2: `AT_C1292063_MarcAuthority_${randomPostfix}_2`,
        headingSearchPrefix: `AT_C1292063_MarcAuthority_${randomPostfix}`,
        noteText: `c1292063test: this 1XX field ${randomPostfix} cool note`,
        noteSearchPrefix: `c1292063test: this 1XX field ${randomPostfix}`,
        noteType: 'Nonpublic general note',
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWith: '1292063',
      };

      // Record 1: has a nonpublic general note (MARC 667 $a)
      const authorityFields1 = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading1}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: '667',
          content: `$a ${testData.noteText}`,
          indicators: ['\\', '\\'],
        },
      ];

      // Record 2: no note fields
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
      ];

      let userData = {};
      let authorityId1;
      let authorityId2;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1292063_');

        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          `${authData.startsWith}1`,
          authorityFields1,
        ).then((id) => {
          authorityId1 = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          `${authData.startsWith}2`,
          authorityFields2,
        ).then((id) => {
          authorityId2 = id;
        });

        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId1, true);
        MarcAuthority.deleteViaAPI(authorityId2, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1292063 Build query using Authority — Notes — Note type, Note (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1292063'] },
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

          // Step 2: Select Authority — Notes — Note type, any operator, verify value dropdown options
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_NOTES_NOTE_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect([testData.noteType]);

          // Step 3: Heading starts with "AT_C1292063_" AND Note type equals "Nonpublic general note"
          //         → heading1 (with note) found, heading2 (no note) not found
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(testData.headingSearchPrefix);
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_NOTES_NOTE_TYPE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(testData.noteType, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyResultFound(testData.authorityHeading2, {
            isFound: false,
          });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Heading starts with "AT_C1292063_" AND Note type not equal to "Nonpublic general note"
          //         → heading2 (no note) found, heading1 (with note) not found
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.chooseValueSelect(testData.noteType, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading2);
          QueryModal.verifyResultFound(testData.authorityHeading1, {
            isFound: false,
          });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Note type IN "Nonpublic general note" AND Note starts with noteSearchPrefix
          //         → heading1 found, "Nonpublic general note" note type visible in result
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_NOTES_NOTE_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(testData.noteType);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_NOTES_NOTE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield(testData.noteSearchPrefix, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(testData.authorityHeading1);
          QueryModal.verifyResultFound(testData.noteType, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
        },
      );
    });
  });
});
