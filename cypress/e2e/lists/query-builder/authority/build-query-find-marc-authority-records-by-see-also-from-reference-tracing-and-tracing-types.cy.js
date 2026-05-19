import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  AUTHORITY_HEADING_TYPES,
  AUTHORITY_QUERY_FIELDS,
} from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322605_List_${getRandomPostfix()}`,
        queryValue: 'AT_C1322605_MarcAuthority',
        totalRecordsCount: 17,
      };

      const marcFile = {
        marc: 'marcAuthFileC1322605.mrc',
        fileName: `testMarcAuthC1322605.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      const authorityheadings = [
        'AT_C1322605_MarcAuthority Geographic Subdivision 181',
        'AT_C1322605_MarcAuthority Medium of Performance Term 162',
        'AT_C1322605_MarcAuthority Subject 150',
        'AT_C1322605_MarcAuthority Form Subdivision 185',
        'AT_C1322605_MarcAuthority Conference Name-title 111',
        'AT_C1322605_MarcAuthority Geographic name 151',
        'AT_C1322605_MarcAuthority Chronological Subdivision 182',
        'AT_C1322605_MarcAuthority Conference Name 111',
        'AT_C1322605_MarcAuthority Genre 155',
        'AT_C1322605_MarcAuthority Chronological Term 148',
        'AT_C1322605_MarcAuthority General Subdivision 180',
        'AT_C1322605_MarcAuthority Personal name 100',
        'AT_C1322605_MarcAuthority Corporate name-title 110',
        'AT_C1322605_MarcAuthority Corporate name 110',
        'AT_C1322605_MarcAuthority Named Event 147',
        'AT_C1322605_MarcAuthority Personal name-title 100',
        'AT_C1322605_MarcAuthority Uniform title 130',
      ];

      const personalNameHeading = authorityheadings[11];
      const corporateNameTitleHeading = authorityheadings[12];
      const corporateNameHeading = authorityheadings[13];
      const personalNameTitleHeading = authorityheadings[15];

      const tracingTypeVerifications = [
        {
          tracingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_SUBDIVISION,
          headings: [authorityheadings[0]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.MEDIUM_OF_PERFORMANCE_TERM,
          headings: [authorityheadings[1]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.TOPICAL_TERM,
          headings: [authorityheadings[2], authorityheadings[14]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.FORM_SUBDIVISION,
          headings: [authorityheadings[3]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME_TITLE,
          headings: [authorityheadings[4]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.GEOGRAPHIC_NAME,
          headings: [authorityheadings[5]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_SUBDIVISION,
          headings: [authorityheadings[6]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CONFERENCE_NAME,
          headings: [authorityheadings[7]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.GENRE_TERM,
          headings: [authorityheadings[8]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CHRONOLOGICAL_TERM,
          headings: [authorityheadings[9], authorityheadings[14]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.GENERAL_SUBDIVISION,
          headings: [authorityheadings[10]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME,
          headings: [authorityheadings[11]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE,
          headings: [authorityheadings[12]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.CORPORATE_NAME,
          headings: [authorityheadings[13], authorityheadings[11]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.NAMED_EVENT,
          headings: [authorityheadings[14]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE,
          headings: [authorityheadings[15]],
        },
        {
          tracingType: AUTHORITY_HEADING_TYPES.UNIFORM_TITLE,
          headings: [authorityheadings[15], authorityheadings[16]],
        },
      ];

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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322605_');

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
        'C1322605 Build query to find MARC authority records by See also from reference - Tracing and Tracing types (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322605'] },
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

          // Step 2: See also from reference — Tracing starts with queryValue AND Tracing type equals Personal name → 1 record
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_SEE_ALSO_FROM_REFERENCE_TRACING);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.populateFiled('input', testData.queryValue);
          QueryModal.addNewRow(0);
          QueryModal.selectField(
            AUTHORITY_QUERY_FIELDS.AUTHORITY_SEE_ALSO_FROM_REFERENCE_TRACING_TYPE,
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(personalNameHeading, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 3: Change row 0 to contains, change Tracing type to 'not equal to' Personal name → 16 records
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.chooseValueSelect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(16);
          QueryModal.verifyResultFound(personalNameHeading, { isFound: false, partialMatch: true });

          // Step 4: Tracing type 'in' [Personal name, Personal name title, Corporate name, Corporate name title] → 4 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedMultiselectValue(AUTHORITY_HEADING_TYPES.PERSONAL_NAME, 1);
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE, 1, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.CORPORATE_NAME, 1, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE, 1, {
            exactMatch: true,
          });
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(personalNameHeading, { partialMatch: true });
          QueryModal.verifyResultFound(personalNameTitleHeading, { partialMatch: true });
          QueryModal.verifyResultFound(corporateNameHeading, { partialMatch: true });
          QueryModal.verifyResultFound(corporateNameTitleHeading, { partialMatch: true });
          QueryModal.verifyNumberOfRowsInPreviewTable(4);

          // Step 5: Tracing type 'not in' [same 4 types] → 13 records
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.verifySelectedMultiselectValue(
            [
              AUTHORITY_HEADING_TYPES.PERSONAL_NAME,
              AUTHORITY_HEADING_TYPES.PERSONAL_NAME_TITLE,
              AUTHORITY_HEADING_TYPES.CORPORATE_NAME,
              AUTHORITY_HEADING_TYPES.CORPORATE_NAME_TITLE,
            ],
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(13);
          QueryModal.verifyResultFound(personalNameHeading, { isFound: false, partialMatch: true });
          QueryModal.verifyResultFound(personalNameTitleHeading, {
            isFound: false,
            partialMatch: true,
          });
          QueryModal.verifyResultFound(corporateNameHeading, {
            isFound: false,
            partialMatch: true,
          });
          QueryModal.verifyResultFound(corporateNameTitleHeading, {
            isFound: false,
            partialMatch: true,
          });

          // Step 6: Tracing type 'is null/empty' False → 17 records (all records have tracing types)
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyNumberOfRowsInPreviewTable(testData.totalRecordsCount);

          // Step 7: Tracing type 'is null/empty' True → no records found
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 8: Repeat step 2 for each See also from reference — Tracing type → expected records per type
          tracingTypeVerifications.forEach(({ tracingType, headings }) => {
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.chooseValueSelect(tracingType, 1);
            QueryModal.runQueryDisabled();
            QueryModal.testQuery();
            QueryModal.runQueryDisabled(false);
            headings.forEach((h) => QueryModal.verifyResultFound(h, { partialMatch: true }));
            QueryModal.verifyNumberOfRowsInPreviewTable(headings.length);
          });
        },
      );
    });
  });
});
