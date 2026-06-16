import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import {
  AUTHORITY_QUERY_FIELDS,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      // Local source file unique code (used as naturalId prefix for record 20)
      const localSourceFileCode = `atc${getRandomLetters(6)}`;
      const localSourceFileName = `AT_C1322608_LocalSF_${randomPostfix}`;

      // NaturalIds for all 20 records
      // Records 1–5: LCNAF (all start with 'n' — the LCNAF source file code)
      //   Record 1 starts with 'nr' specifically (used in step 17: starts with 'nr')
      //   Record 2 naturalId stored for steps 14–16 (equals / not-equal / contains queries)
      const naturalId2 = `n1322608${randomDigits}`;

      // Headings for all 20 records (0-indexed, displayed as "C1322608 Record N")
      const headings = Array.from(
        { length: 20 },
        (_, i) => `AT_C1322608_MarcAuthority_${randomPostfix}_${i + 1}`,
      );
      // headings[0]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_1'  — LCNAF, naturalId starts with 'nr'
      // headings[1]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_2'  — LCNAF, naturalId = naturalId2 (steps 14–16)
      // headings[2]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_3'  — LCNAF
      // headings[3]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_4'  — LCNAF
      // headings[4]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_5'  — LCNAF
      // headings[5]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_6'  — LCSH
      // headings[6]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_7'  — LC Children's Subject Headings
      // headings[7]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_8'  — LCDGT
      // headings[8]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_9'  — LCGFT
      // headings[9]  = 'AT_C1322608_MarcAuthority_${randomPostfix}_10' — LCMPT
      // headings[10] = 'AT_C1322608_MarcAuthority_${randomPostfix}_11' — FAST
      // headings[11] = 'AT_C1322608_MarcAuthority_${randomPostfix}_12' — MeSH
      // headings[12] = 'AT_C1322608_MarcAuthority_${randomPostfix}_13' — MeSH
      // headings[13] = 'AT_C1322608_MarcAuthority_${randomPostfix}_14' — RBMS
      // headings[14] = 'AT_C1322608_MarcAuthority_${randomPostfix}_15' — TGM
      // headings[15] = 'AT_C1322608_MarcAuthority_${randomPostfix}_16' — AAT
      // headings[16] = 'AT_C1322608_MarcAuthority_${randomPostfix}_17' — AAT
      // headings[17] = 'AT_C1322608_MarcAuthority_${randomPostfix}_18' — GSAFD
      // headings[18] = 'AT_C1322608_MarcAuthority_${randomPostfix}_19' — no source file ('zz' prefix matches nothing)
      // headings[19] = 'AT_C1322608_MarcAuthority_${randomPostfix}_20' — local source file

      const testData = {
        recordType: 'Authority',
        listName: `AT_C1322608_List_${randomPostfix}`,
        localSourceFileName,
        localSourceFileCode,
        record2NaturalId: naturalId2,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
      ];

      let userData = {};
      let localSourceFileId;

      // Returns a 100-field array for MarcAuthorities.createMarcAuthorityViaAPI
      const makeFields = (heading) => [
        { tag: '100', content: `$a ${heading}`, indicators: ['\\', '\\'] },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322608_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C1322608_').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        // Create local authority source file; record 20 will use its code as the naturalId prefix
        cy.createAuthoritySourceFileViaAPI({
          name: testData.localSourceFileName,
          code: testData.localSourceFileCode,
        }).then((body) => {
          localSourceFileId = body.id;
          cy.wait(70_000); // Wait for the source file to be processed
          cy.getAdminToken();

          // Records 1–5: LCNAF (prefix 'n'; record 1 uses 'nr' for step 17)
          MarcAuthorities.createMarcAuthorityViaAPI(
            'nr',
            `1322608${randomDigits}`,
            makeFields(headings[0]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'n',
            `1322608${randomDigits}`,
            makeFields(headings[1]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'nb',
            `1322608${randomDigits}`,
            makeFields(headings[2]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'no',
            `1322608${randomDigits}`,
            makeFields(headings[3]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'ns',
            `1322608${randomDigits}`,
            makeFields(headings[4]),
          );
          // Record 6: LCSH (prefix 'sh')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'sh',
            `1322608${randomDigits}`,
            makeFields(headings[5]),
          );
          // Record 7: LC Children's Subject Headings (prefix 'sj')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'sj',
            `1322608${randomDigits}`,
            makeFields(headings[6]),
          );
          // Record 8: LCDGT (prefix 'dg')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'dg',
            `1322608${randomDigits}`,
            makeFields(headings[7]),
          );
          // Record 9: LCGFT (prefix 'gf')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'gf',
            `1322608${randomDigits}`,
            makeFields(headings[8]),
          );
          // Record 10: LCMPT (prefix 'mp')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'mp',
            `1322608${randomDigits}`,
            makeFields(headings[9]),
          );
          // Record 11: FAST (prefix 'fst')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'fst',
            `1322608${randomDigits}`,
            makeFields(headings[10]),
          );
          // Records 12–13: MeSH (prefix 'D')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'D',
            `1322608${randomDigits}1`,
            makeFields(headings[11]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'D',
            `1322608${randomDigits}2`,
            makeFields(headings[12]),
          );
          // Record 14: RBMS (prefix 'rbmscv')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'rbmscv',
            `1322608${randomDigits}`,
            makeFields(headings[13]),
          );
          // Record 15: TGM (prefix 'tgm')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'tgm',
            `1322608${randomDigits}`,
            makeFields(headings[14]),
          );
          // Records 16–17: AAT (prefix 'aat')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'aat',
            `1322608${randomDigits}1`,
            makeFields(headings[15]),
          );
          MarcAuthorities.createMarcAuthorityViaAPI(
            'aat',
            `1322608${randomDigits}2`,
            makeFields(headings[16]),
          );
          // Record 18: GSAFD (prefix 'gsafd')
          MarcAuthorities.createMarcAuthorityViaAPI(
            'gsafd',
            `1322608${randomDigits}`,
            makeFields(headings[17]),
          );
          // Record 19: no source file ('zz' doesn't match any known source file code)
          MarcAuthorities.createMarcAuthorityViaAPI(
            'zz',
            `1322608${randomDigits}`,
            makeFields(headings[18]),
          );
          // Record 20: local source file (prefix = localSourceFileCode)
          MarcAuthorities.createMarcAuthorityViaAPI(
            localSourceFileCode,
            `1322608${randomDigits}`,
            makeFields(headings[19]),
          );

          cy.createTempUser([]).then((userProperties) => {
            userData = userProperties;
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1322608_');
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localSourceFileName);
        cy.deleteAuthoritySourceFileViaAPI(localSourceFileId, true);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1322608 Build query to find MARC authority records by Source file — Name and Authority — Natural ID (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1322608'] },
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

          // Row 0: Heading starts with "C1322608" — stays for all steps
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield('AT_C1322608_MarcAuthority');

          // Row 1: Source file — Name (added once; operator/value changed per step)
          QueryModal.addNewRow();
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.SOURCE_FILE_NAME, 1);

          // Step 2: Source file equals AAT → records 16, 17 (2 rows)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(
            DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[15]);
          QueryModal.verifyResultFound(headings[16]);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Step 3: Source file equals FAST → record 11 (1 row)
          QueryModal.chooseValueSelect(
            DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[10]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 4: Source file equals GSAFD → record 18 (1 row)
          QueryModal.chooseValueSelect(DEFAULT_FOLIO_AUTHORITY_FILES.GSAFD_GENRE_TERMS, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[17]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 5: Source file equals LC Children's Subject Headings → record 7 (1 row)
          QueryModal.chooseValueSelect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[6]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 6: Source file in [LCDGT, LCGFT, LCMPT] → records 8, 9, 10 (3 rows)
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          // LC Children's Subject Headings is carried over as a tag from step 5 — deselect it
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
            1,
          );
          QueryModal.verifySelectedMultiselectValue([], 1);
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
            1,
          );
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS,
            1,
          );
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_MEDIUM_OF_PERFORMANCE_THESAURUS_FOR_MUSIC,
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[7]);
          QueryModal.verifyNumberOfRowsInPreviewTable(3);

          // Step 7: Source file equals LCNAF → records 1–5 (5 rows)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[0]);
          QueryModal.verifyNumberOfRowsInPreviewTable(5);

          // Step 8: Source file in [MeSH, RBMS, TGM] → records 12, 13, 14, 15 (4 rows)
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          // LC Name Authority file (LCNAF) is carried over as a tag from step 7 — deselect it
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            1,
          );
          QueryModal.verifySelectedMultiselectValue([], 1);
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            1,
          );
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.RARE_BOOKS_AND_MANUSCRIPTS_SECTION,
            1,
          );
          QueryModal.chooseFromValueMultiselect(
            DEFAULT_FOLIO_AUTHORITY_FILES.THESAURUS_FOR_GRAPHIC_MATERIALS,
            1,
          );
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[11]);
          QueryModal.verifyNumberOfRowsInPreviewTable(4);

          // Step 9: Source file equals LCSH → record 6 (1 row)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[5]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 10: Source file equals local source file → record 20 (1 row)
          QueryModal.chooseValueSelect(testData.localSourceFileName, 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[19]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 11: Source file not in [all 12 default + local] → record 19 (1 row, no source file)
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          // localSourceFileName is carried over as a tag from step 10 — add only the 12 defaults
          Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((name) => {
            QueryModal.chooseFromValueMultiselect(name, 1);
          });
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[18]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 12: Source file is null/empty True → record 19 (1 row)
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[18]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 13: Source file is null/empty False → 19 rows (all records except record 19)
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[0]);
          QueryModal.verifyNumberOfRowsInPreviewTable(19);

          // Add Row 2 for Natural ID — used in steps 14–17
          QueryModal.addNewRow();
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_NATURAL_ID, 2);

          // Step 14: Source file null/empty False AND Natural ID equals record 2's naturalId → 1 row
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.fillInValueTextfield(testData.record2NaturalId, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[1]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 15: Source file equals LCNAF AND Natural ID not equal to record 2's naturalId
          //          → records 1, 3, 4, 5 (4 rows)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[0]);
          QueryModal.verifyNumberOfRowsInPreviewTable(4);

          // Step 16: Source file equals LCNAF AND Natural ID contains record 2's naturalId → 1 row
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[1]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 17: Source file equals LCNAF AND Natural ID starts with 'nr' → record 1 (1 row)
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
          QueryModal.fillInValueTextfield('nr', 2);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[0]);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);

          // Step 18: Heading starts with "C1322608" AND Natural ID is null/empty True → 0 rows
          // Delete Row 1 (Source file — LCNAF); old Row 2 (Natural ID) shifts up to Row 1
          QueryModal.clickGarbage(1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('True', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyQueryReturnsNoResults();

          // Step 19: Heading starts with "C1322608" AND Natural ID is null/empty False → 20 rows
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.runQueryDisabled();
          QueryModal.testQuery();
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyResultFound(headings[0]);
          QueryModal.verifyNumberOfRowsInPreviewTable(20);
        },
      );
    });
  });
});
