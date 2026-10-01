import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile from '../../../../support/fragments/lists/lists-file';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

const testCaseId = 'C1504436';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const marcColumn = (tag, ind1, ind2) => {
  return `MARC ${tag} ind1=${ind1} ind2=${ind2}`;
};
const column010 = marcColumn('010', 'blank', 'blank');
const column035 = marcColumn('035', 'blank', 'blank');
const column100 = marcColumn('100', '1', 'blank');
const column670 = marcColumn('670', 'blank', 'blank');
const column999 = marcColumn('999', 'f', 'f');
const column500 = marcColumn('500', '1', 'blank');
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
// The authority file of a record is resolved from the prefix of its natural ID: "n" belongs to LCNAF,
// the code of the local authority file belongs to that file. The digits after the prefix are the same
// for every record of this run
const naturalIdDigits = `${randomNDigitNumber(12)}`;
const naturalIds = {
  AA: `n${naturalIdDigits}1`,
  AB: `n${naturalIdDigits}2`,
  AC: `n${naturalIdDigits}3`,
  AD: `n${naturalIdDigits}4`,
  AE: `${localSourceFileCode}${naturalIdDigits}5`,
  AF: `n${naturalIdDigits}6`,
};
const canceledNaturalIdAC = `n${naturalIdDigits}93`;
// The 035, 1XX and 5XX values of record AA and record AC differ in case only, matching is case-insensitive
const systemControlNumberAB1 = `(OCoLC)${marcPrefix}_AB1`;
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const alphabetaName = `${marcPrefix}_Alphabeta, Carla`;
const alphabetaNameUpperCase = `${marcPrefix}_ALPHABETA, CARLA`;
const alphaAnnaName = `${marcPrefix}_Alpha, Anna`;
const betaBrunoName = `${marcPrefix}_Beta, Bruno`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
const alphabetaDates = '1900-1980';
const sourceCitation = (name) => `${marcPrefix}_Source citation ${name}`;
const infoFound = (name) => `${marcPrefix}_Info found ${name}`;
const shakespeareSearchValue = `${marcPrefix}_Shak`;
const infoFoundSearchValue = `${marcPrefix}_Info found`;
// Every record of this run carries the same digits in its 010 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "is null/empty
// False" matches every record having the queried field (the test case notes allow extra filters)
const narrowingCondition = `${column010} contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    values010: [naturalIds.AA],
    values035: [`(OCoLC)${marcPrefix}_AA1`],
    values100: [shakespeareName, shakespeareDates],
    values500: [alphabetaName, alphabetaDates],
    values670: [sourceCitation('alpha'), infoFound('alpha')],
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AA1`),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Shakspere, William $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${alphabetaName} $d ${alphabetaDates}`, ['1', blank]),
      marcField('670', `$a ${sourceCitation('alpha')} $b ${infoFound('alpha')}`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    values010: [naturalIds.AB],
    values035: [systemControlNumberAB1, `(DE-588)${marcPrefix}_AB2`],
    values100: [marloweName, marloweDates],
    values500: [alphaAnnaName, '1901-1981', betaBrunoName, '1902-1982'],
    values670: [
      sourceCitation('beta'),
      infoFound('beta'),
      sourceCitation('gamma'),
      infoFound('gamma'),
    ],
    fields: [
      marcField('010', `$a ${naturalIds.AB}`),
      marcField('035', `$a ${systemControlNumberAB1}`),
      marcField('035', `$a (DE-588)${marcPrefix}_AB2`),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlow, Kit $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlowe family`, ['3', blank]),
      marcField('500', `$a ${alphaAnnaName} $d 1901-1981`, ['1', blank]),
      marcField('500', `$a ${betaBrunoName} $d 1902-1982`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Gamma family`, ['3', blank]),
      marcField('670', `$a ${sourceCitation('beta')} $b ${infoFound('beta')}`),
      marcField('670', `$a ${sourceCitation('gamma')} $b ${infoFound('gamma')}`),
    ],
  },
  recordAC: {
    naturalId: naturalIds.AC,
    values010: [naturalIds.AC, canceledNaturalIdAC],
    values035: [`(ocolc)${marcPrefix.toLowerCase()}_ac1`],
    values100: [shakespeareNameUpperCase, shakespeareDates],
    values500: [alphabetaNameUpperCase, alphabetaDates],
    values670: [`${marcPrefix.toLowerCase()}_source citation delta`],
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      marcField('035', `$a (ocolc)${marcPrefix.toLowerCase()}_ac1`),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix.toLowerCase()}_shakspere, william $d ${shakespeareDates}`, [
        '1',
        blank,
      ]),
      marcField('500', `$a ${alphabetaNameUpperCase} $d ${alphabetaDates}`, ['1', blank]),
      marcField('670', `$a ${marcPrefix.toLowerCase()}_source citation delta`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    values010: [naturalIds.AD],
    values035: [],
    values100: [`${marcPrefix}_Minimal, Mary`],
    values500: [],
    values670: [],
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${marcPrefix}_Minimal, Mary`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    values010: [naturalIds.AE],
    values035: [`(OCoLC)${marcPrefix}_AE1`],
    values100: [],
    values500: [],
    values670: [sourceCitation('epsilon'), infoFound('epsilon')],
    fields: [
      marcField('010', `$a ${naturalIds.AE}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AE1`),
      marcField('110', `$a ${marcPrefix}_Globe Theatre Company`, ['2', blank]),
      marcField('410', `$a ${marcPrefix}_Globe Players`, ['2', blank]),
      marcField('510', `$a ${marcPrefix}_Rose Theatre Company`, ['2', blank]),
      marcField('670', `$a ${sourceCitation('epsilon')} $b ${infoFound('epsilon')}`),
    ],
  },
  recordAF: {
    naturalId: naturalIds.AF,
    values010: [naturalIds.AF],
    values035: [`(OCoLC)${marcPrefix}_AF1`],
    // The 1XX, 4XX and 5XX fields of record AF have "0" as the first indicator
    values100: [],
    values500: [],
    values670: [sourceCitation('zeta'), infoFound('zeta')],
    fields: [
      marcField('010', `$a ${naturalIds.AF}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AF1`),
      marcField('100', `$a ${marcPrefix}_Homerus`, ['0', blank]),
      marcField('400', `$a ${marcPrefix}_Homer`, ['0', blank]),
      marcField('500', `$a ${marcPrefix}_Vergilius`, ['0', blank]),
      marcField('670', `$a ${sourceCitation('zeta')} $b ${infoFound('zeta')}`),
    ],
  },
};
const { recordAA, recordAB, recordAC, recordAD, recordAE, recordAF } = authorityRecords;
const allRecords = Object.values(authorityRecords);

const capabSetsToAssign = [
  CapabilitySets.moduleListsManage,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
  CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
];

let user;
let localSourceFileId;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`AT_${testCaseId}`);
        cy.getAuthoritySourceFileDataViaAPI(`AT_${testCaseId}_`).then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        // Record AE belongs to this local authority file, the other records belong to LCNAF
        cy.createAuthoritySourceFileViaAPI({
          name: localSourceFileName,
          code: localSourceFileCode,
        }).then((body) => {
          localSourceFileId = body.id;
          cy.wait(70_000); // Wait for the source file to be processed
          cy.getAdminToken();

          allRecords.forEach((record) => {
            MarcAuthorities.createMarcAuthorityViaAPI(record.naturalId, '', record.fields).then(
              (authorityId) => {
                record.id = authorityId;
              },
            );
          });

          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssign);

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
        allRecords.forEach((record) => {
          MarcAuthority.deleteViaAPI(record.id, true);
        });
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localSourceFileName);
        cy.deleteAuthoritySourceFileViaAPI(localSourceFileId, true);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(`*${listName}*`);
      });

      it(
        'C1504436 Query Authorities by marc_<tag>_<indicator1>_<indicator2> (athena)',
        { tags: ['criticalPath', 'athena', 'C1504436'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Search by marc_010_ind1_blank_ind2_blank field using "equals" operator
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.fillInMarcTag('010');
          QueryModal.fillInMarcIndicator1(blank);
          QueryModal.fillInMarcIndicator2(blank);
          QueryModal.verifyMarcTagValue('010');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.naturalId);
          QueryModal.verifyMarcValueTextfield(recordAA.naturalId);
          QueryModal.verifyQueryAreaContent(`(${column010} == ${recordAA.naturalId})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(column010);
          QueryModal.verifyResultTableColumnValues(
            recordAA.naturalId,
            column010,
            recordAA.values010,
          );
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 2: Search by marc_035_ind1_blank_ind2_blank AND marc_100_ind1_1_ind2_blank fields
          QueryModal.fillInMarcTag('035');
          QueryModal.verifyMarcTagValue('035');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(systemControlNumberAB1);
          QueryModal.verifyMarcValueTextfield(systemControlNumberAB1);
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.verifySelectedField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('100', 1);
          QueryModal.fillInMarcIndicator1('1', 1);
          QueryModal.fillInMarcIndicator2(blank, 1);
          QueryModal.verifyMarcTagValue('100', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', ind2: blank }, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInMarcValueTextfield(shakespeareSearchValue, 1);
          QueryModal.verifyMarcValueTextfield(shakespeareSearchValue, 1);
          QueryModal.verifyQueryAreaContent(
            `(${column035} != ${systemControlNumberAB1}) AND (${column100} starts with ${shakespeareSearchValue})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyResultTableColumnDisplayed(column035);
          QueryModal.verifyResultTableColumnDisplayed(column100);
          [recordAA, recordAC].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(record.naturalId, column035, record.values035);
            QueryModal.verifyResultTableColumnValues(record.naturalId, column100, record.values100);
          });
          [recordAB, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 3: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${column035} != ${systemControlNumberAB1}) AND (${column100} starts with ${shakespeareSearchValue})`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 4: Click "View updated list" link, check the rows and MARC columns of the saved list
            Lists.viewUpdatedList();
            Lists.verifyResultColumnDisplayed(column035);
            Lists.verifyResultColumnDisplayed(column100);
            [recordAA, recordAC].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column035,
                record.values035,
                { inBuildQueryForm: false },
              );
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column100,
                record.values100,
                { inBuildQueryForm: false },
              );
            });

            // Step 5: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              column035,
              column100,
              recordAA.naturalId,
              recordAC.naturalId,
              ...recordAA.values035,
              ...recordAC.values035,
              shakespeareName,
              shakespeareNameUpperCase,
            ]);
            ListsFile.verifyCsvFileRowsRecordsNumber(listName, 2);

            // Step 6: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('035');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
            QueryModal.verifyMarcValueTextfield(systemControlNumberAB1);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('100', 1);
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', ind2: blank }, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 1);
            QueryModal.verifyMarcValueTextfield(shakespeareSearchValue, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column035} != ${systemControlNumberAB1}) AND (${column100} starts with ${shakespeareSearchValue})`,
            );

            // Step 7: Remove the second condition, search by marc_670_ind1_blank_ind2_blank field
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('670');
            QueryModal.verifyMarcTagValue('670');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: blank, ind2: blank });
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.fillInMarcValueTextfield(infoFoundSearchValue);
            QueryModal.verifyMarcValueTextfield(infoFoundSearchValue);
            QueryModal.verifyQueryAreaContent(`(${column670} contains ${infoFoundSearchValue})`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(4);
            QueryModal.verifyResultTableColumnDisplayed(column670);
            [recordAA, recordAB, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column670,
                record.values670,
              );
            });
            [recordAC, recordAD].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });

            // Step 8: Search by marc_999_ind1_f_ind2_f field using "is null/empty" with "True" value
            QueryModal.fillInMarcTag('999');
            QueryModal.fillInMarcIndicator1('f');
            QueryModal.fillInMarcIndicator2('f');
            QueryModal.verifyMarcTagValue('999');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: 'f', ind2: 'f' });
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            QueryModal.verifyQueryAreaContent(`(${column999} is null/empty True)`);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyQueryReturnsNoResults();
            QueryModal.verifyResultsTableAbsent();

            // Step 9: Search by marc_500_ind1_1_ind2_blank field using "is null/empty" with "False"
            QueryModal.fillInMarcTag('500');
            QueryModal.fillInMarcIndicator1('1');
            QueryModal.fillInMarcIndicator2(blank);
            QueryModal.verifyMarcTagValue('500');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues({ ind1: '1', ind2: blank });
            // Refilling the "Tag" box empties it for a moment, which leaves the row without a MARC field
            // and resets the operator, so "is null/empty" of the previous step has to be selected again
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.verifySelectedValue('False');
            // "is null/empty False" matches every record having the queried field, so the second
            // condition narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('010', 1);
            QueryModal.fillInMarcIndicator1(blank, 1);
            QueryModal.fillInMarcIndicator2(blank, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${column500} is null/empty False) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(3);
            QueryModal.verifyResultTableColumnDisplayed(column500);
            [recordAA, recordAB, recordAC].forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                column500,
                record.values500,
              );
            });
            [recordAD, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });
          });
        },
      );
    });
  });
});
