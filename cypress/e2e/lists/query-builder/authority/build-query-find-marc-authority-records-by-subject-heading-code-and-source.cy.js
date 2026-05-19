import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES, AUTHORITY_QUERY_FIELDS } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322609_List_${getRandomPostfix()}`,
        queryValue: 'AT_C1322609_MarcAuthority',
        totalRecordsCount: 17,
      };

      const marcFile = {
        marc: 'marcAuthFileC1322609.mrc',
        fileName: `testMarcAuthC1322609.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      // Records with subject heading code 'a' (step 2 — 2 records)
      const personalNameHeading = 'AT_C1322609_MarcAuthority Personal name 100';
      const subjectHeading = 'AT_C1322609_MarcAuthority Subject 150';
      // Record with subject heading code containing/starting with 'v' (steps 4–5 — 1 record)
      const formSubdivisionHeading = 'AT_C1322609_MarcAuthority Form Subdivision 185';

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
      ];

      let userData = {};
      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322609_');

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIds.push(record.authority.id);
          });
        });

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
        'C1322609 Build query to find MARC authority records by Authority — Subject heading code and Authority — Source (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322609'] },
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

          // Set up Row 0: Heading contains queryValue (applies to all steps)
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(testData.queryValue);

          // Add Row 1: Subject heading code (operator/value changed per step 2–7)
          QueryModal.addNewRow(0);
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_SUBJECT_HEADING_CODE, 1);

          // Step 2: Subject heading code equals 'a' → 2 records (Personal name 100, Subject 150)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield('a', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(personalNameHeading, { partialMatch: true });
          QueryModal.verifyResultFound(subjectHeading, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 3: Subject heading code not equal to 'a' → 15 records (all except Personal name, Subject)
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(personalNameHeading, { isFound: false, partialMatch: true });
          QueryModal.verifyResultFound(subjectHeading, { isFound: false, partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(15);

          // Step 4: Subject heading code contains 'v' → 1 record (Form Subdivision 185)
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInValueTextfield('v', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(formSubdivisionHeading, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Subject heading code starts with 'v' → 1 record (Form Subdivision 185)
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(formSubdivisionHeading, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 6: Subject heading code is null/empty True → no records
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 7: Subject heading code is null/empty False → all 17 records
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Add Row 2: Authority — Source (used in steps 8–13)
          QueryModal.addNewRow();
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_SOURCE, 2);

          // Step 8: Subject heading code null/empty False AND Source equals 'marc' → all 17 records
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.fillInValueTextfield('marc', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 9: Source not equal to 'marc' → no records
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 10: Source contains 'MAR' → all 17 records
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 2);
          QueryModal.fillInValueTextfield('MAR', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 11: Source starts with 'mA' → all 17 records
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
          QueryModal.fillInValueTextfield('mA', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 12: Source is null/empty False → all 17 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.selectValueFromSelect('False', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 13: Source is null/empty True → no records
          QueryModal.selectValueFromSelect('True', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();
        },
      );
    });
  });
});
