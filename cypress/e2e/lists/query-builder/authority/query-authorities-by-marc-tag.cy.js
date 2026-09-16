import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { Lists } from '../../../../support/fragments/lists/lists';
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

const testCaseId = 'C1474741';
const randomPostfix = getRandomPostfix();
const listName = `AT_${testCaseId}_List_${randomPostfix}`;
// Unique beginning of the MARC field values, so the records of this run are not mixed up with other records
const marcPrefix = `AT_${testCaseId}_${randomPostfix}`;
const localSourceFileName = `AT_${testCaseId}_LocalSF_${randomPostfix}`;
const localSourceFileCode = `atc${getRandomLetters(6)}`;
const marcFieldOption = 'MARC Authority — MARC';
const marcColumn = (tag) => `MARC ${tag}`;
const blank = '\\';
const marcField = (tag, content, indicators = [blank, blank]) => ({ tag, content, indicators });
// The 005 field of every record created by this run holds the date and time of its creation
const currentYear = `${new Date().getFullYear()}`;
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
// The 100 values of record AA and record AC differ in case only, matching is case-insensitive
const shakespeareName = `${marcPrefix}_Shakespeare, William`;
const shakespeareNameUpperCase = `${marcPrefix}_SHAKESPEARE, WILLIAM`;
const marloweName = `${marcPrefix}_Marlowe, Christopher`;
const minimalName = `${marcPrefix}_Minimal, Mary`;
const homerusName = `${marcPrefix}_Homerus`;
const shakespeareDates = '1564-1616';
const marloweDates = '1564-1593';
const sourceCitation = (name) => `${marcPrefix}_Source citation ${name}`;
const infoFound = (name) => `${marcPrefix}_Info found ${name}`;
// The 670 values of record AC are in lower case, "starts with" is case-insensitive
const sourceCitationDelta = `${marcPrefix.toLowerCase()}_source citation delta`;
const sourceCitationSearchValue = `${marcPrefix}_Source`;
// Every record of this run carries the same digits in its 010 field. The condition below is added as the
// second row where the queried operator alone matches most of the records of the tenant: "not equal to" and
// "is null/empty True" also match the records without the queried field (the test case notes allow filters)
const narrowingCondition = `MARC 010 contains ${naturalIdDigits}`;

const authorityRecords = {
  recordAA: {
    naturalId: naturalIds.AA,
    values010: [naturalIds.AA],
    values100: [shakespeareName, shakespeareDates],
    values670: [sourceCitation('alpha'), infoFound('alpha')],
    fields: [
      marcField('010', `$a ${naturalIds.AA}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AA1`),
      marcField('100', `$a ${shakespeareName} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Shakspere, William $d ${shakespeareDates}`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Alphabeta, Carla $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${sourceCitation('alpha')} $b ${infoFound('alpha')}`),
    ],
  },
  recordAB: {
    naturalId: naturalIds.AB,
    values010: [naturalIds.AB],
    values100: [marloweName, marloweDates],
    values670: [
      sourceCitation('beta'),
      infoFound('beta'),
      sourceCitation('gamma'),
      infoFound('gamma'),
    ],
    fields: [
      marcField('010', `$a ${naturalIds.AB}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AB1`),
      marcField('035', `$a (DE-588)${marcPrefix}_AB2`),
      marcField('100', `$a ${marloweName} $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlow, Kit $d ${marloweDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix}_Marlowe family`, ['3', blank]),
      marcField('500', `$a ${marcPrefix}_Alpha, Anna $d 1901-1981`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Beta, Bruno $d 1902-1982`, ['1', blank]),
      marcField('500', `$a ${marcPrefix}_Gamma family`, ['3', blank]),
      marcField('670', `$a ${sourceCitation('beta')} $b ${infoFound('beta')}`),
      marcField('670', `$a ${sourceCitation('gamma')} $b ${infoFound('gamma')}`),
    ],
  },
  recordAC: {
    naturalId: naturalIds.AC,
    values010: [naturalIds.AC, canceledNaturalIdAC],
    values100: [shakespeareNameUpperCase, shakespeareDates],
    values670: [sourceCitationDelta],
    fields: [
      marcField('010', `$a ${naturalIds.AC} $z ${canceledNaturalIdAC}`),
      marcField('035', `$a (ocolc)${marcPrefix.toLowerCase()}_ac1`),
      marcField('100', `$a ${shakespeareNameUpperCase} $d ${shakespeareDates}`, ['1', blank]),
      marcField('400', `$a ${marcPrefix.toLowerCase()}_shakspere, william $d ${shakespeareDates}`, [
        '1',
        blank,
      ]),
      marcField('500', `$a ${marcPrefix}_ALPHABETA, CARLA $d 1900-1980`, ['1', blank]),
      marcField('670', `$a ${sourceCitationDelta}`),
    ],
  },
  recordAD: {
    naturalId: naturalIds.AD,
    values010: [naturalIds.AD],
    values100: [minimalName],
    values670: [],
    fields: [
      marcField('010', `$a ${naturalIds.AD}`),
      marcField('100', `$a ${minimalName}`, ['1', blank]),
    ],
  },
  recordAE: {
    naturalId: naturalIds.AE,
    values010: [naturalIds.AE],
    values100: [],
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
    values100: [homerusName],
    values670: [sourceCitation('zeta'), infoFound('zeta')],
    fields: [
      marcField('010', `$a ${naturalIds.AF}`),
      marcField('035', `$a (OCoLC)${marcPrefix}_AF1`),
      marcField('100', `$a ${homerusName}`, ['0', blank]),
      marcField('400', `$a ${marcPrefix}_Homer`, ['0', blank]),
      marcField('500', `$a ${marcPrefix}_Vergilius`, ['0', blank]),
      marcField('670', `$a ${sourceCitation('zeta')} $b ${infoFound('zeta')}`),
    ],
  },
};
const { recordAA, recordAB, recordAC, recordAD, recordAE, recordAF } = authorityRecords;
const allRecords = Object.values(authorityRecords);
const recordsWith100 = [recordAA, recordAB, recordAC, recordAD, recordAF];
const recordsWith670 = [recordAA, recordAB, recordAC, recordAE, recordAF];

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
                // System-populated control fields of the created MARC record (001 = HRID, 005 = date and time)
                cy.getSrsRecordsByAuthorityId(authorityId).then((srsRecord) => {
                  const marcFields = srsRecord.parsedRecord.content.fields;
                  record.field001 = marcFields.find((field) => field['001'])['001'];
                  record.field005 = marcFields.find((field) => field['005'])['005'];
                });
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
        'C1474741 Query Authorities by marc_<tag> (athena)',
        { tags: ['criticalPath', 'athena', 'C1474741'] },
        () => {
          // Precondition: open "Build query" for the "Authority" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.authority);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 1: Select "MARC Authority — MARC" in "Select field" dropdown
          QueryModal.selectField(marcFieldOption);
          QueryModal.verifySelectedField(marcFieldOption);
          QueryModal.verifyMarcSelectorDisplayed();
          QueryModal.verifyEmptyOperator();
          QueryModal.verifyEmptyValue();
          QueryModal.verifyQueryAreaContent('');
          QueryModal.testQueryDisabled();
          QueryModal.runQueryAndSaveDisabled();

          // Step 2: Search by marc_001 field using "equals" operator
          QueryModal.fillInMarcTag('001');
          QueryModal.verifyMarcTagValue('001');
          QueryModal.verifyMarcIndicatorsAndSubfieldAbsent();
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.field001);
          QueryModal.verifyMarcValueTextfield(recordAA.field001);
          QueryModal.verifyQueryAreaContent(`(${marcColumn('001')} == ${recordAA.field001})`);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('001'));
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, marcColumn('001'), [
            recordAA.field001,
          ]);
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 3: Search by the same marc_001 value with its letters uppercased
          QueryModal.verifyMarcTagValue('001');
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.field001.toUpperCase());
          QueryModal.verifyMarcValueTextfield(recordAA.field001.toUpperCase());
          QueryModal.verifyQueryAreaContent(
            `(${marcColumn('001')} == ${recordAA.field001.toUpperCase()})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyResultTableColumnValues(recordAA.naturalId, marcColumn('001'), [
            recordAA.field001,
          ]);
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
          });

          // Step 4: Search by marc_010 field using "not equal to" operator
          QueryModal.fillInMarcTag('010');
          QueryModal.verifyMarcTagValue('010');
          QueryModal.verifyMarcIndicatorsAndSubfieldValues();
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.fillInMarcValueTextfield(recordAA.naturalId);
          QueryModal.verifyMarcValueTextfield(recordAA.naturalId);
          // "not equal to" also matches the records without the queried field, so the second condition
          // narrows the result down to the records created in preconditions
          QueryModal.addNewRow();
          QueryModal.verifyBooleanColumn(1);
          QueryModal.selectField(marcFieldOption, 1);
          QueryModal.fillInMarcTag('010', 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
          QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
          QueryModal.verifyQueryAreaContent(
            `(${marcColumn('010')} != ${recordAA.naturalId}) AND (${narrowingCondition})`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          QueryModal.verifyResultTableColumnDisplayed(marcColumn('010'));
          [recordAB, recordAC, recordAD, recordAE, recordAF].forEach((record) => {
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              marcColumn('010'),
              record.values010,
            );
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAA.naturalId);

          // Step 5: Search by marc_005, marc_001 and marc_100 fields joined with AND
          QueryModal.fillInMarcTag('005');
          QueryModal.verifyMarcTagValue('005');
          QueryModal.verifyMarcIndicatorsAndSubfieldAbsent();
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInMarcValueTextfield(currentYear);
          QueryModal.verifyMarcValueTextfield(currentYear);
          QueryModal.fillInMarcTag('001', 1);
          QueryModal.verifyMarcTagValue('001', 1);
          QueryModal.verifyMarcIndicatorsAndSubfieldAbsent(1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
          QueryModal.selectValueFromSelect('False', 1);
          QueryModal.verifySelectedValue('False', 1);
          QueryModal.addNewRow(1);
          QueryModal.verifyBooleanColumn(2);
          QueryModal.selectField(marcFieldOption, 2);
          QueryModal.verifySelectedField(marcFieldOption, 2);
          QueryModal.fillInMarcTag('100', 2);
          QueryModal.verifyMarcTagValue('100', 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 2);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 2);
          QueryModal.fillInMarcValueTextfield(`${marcPrefix}_`, 2);
          QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`, 2);
          QueryModal.verifyQueryAreaContent(
            `(${marcColumn('005')} contains ${currentYear}) AND (${marcColumn('001')} is null/empty False) AND (${marcColumn('100')} contains ${marcPrefix}_)`,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          ['005', '001', '100'].forEach((tag) => {
            QueryModal.verifyResultTableColumnDisplayed(marcColumn(tag));
          });
          recordsWith100.forEach((record) => {
            QueryModal.verifyResultTableColumnValues(record.naturalId, marcColumn('005'), [
              record.field005,
            ]);
            QueryModal.verifyResultTableColumnValues(record.naturalId, marcColumn('001'), [
              record.field001,
            ]);
            QueryModal.verifyResultTableColumnValues(
              record.naturalId,
              marcColumn('100'),
              record.values100,
            );
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAE.naturalId);
          QueryModal.runQueryAndSaveDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 6: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listName);
            Lists.getQueryText().should(
              'include',
              `(${marcColumn('005')} contains ${currentYear}) AND (${marcColumn('001')} is null/empty False) AND (${marcColumn('100')} contains ${marcPrefix}_)`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 7: Click "View updated list" link, check the rows and MARC columns of the saved list
            Lists.viewUpdatedList();
            ['005', '001', '100'].forEach((tag) => {
              Lists.verifyResultColumnDisplayed(marcColumn(tag));
            });
            recordsWith100.forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                marcColumn('005'),
                [record.field005],
                { inBuildQueryForm: false },
              );
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                marcColumn('001'),
                [record.field001],
                { inBuildQueryForm: false },
              );
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                marcColumn('100'),
                record.values100,
                { inBuildQueryForm: false },
              );
            });

            // Step 8: Click "Actions" menu > "Export all columns (CSV)"
            Lists.openActions();
            Lists.exportList();
            Lists.verifyExportCallouts(listName);
            ExportFile.verifyFileIncludes(`${listName}.csv`, [
              marcColumn('005'),
              marcColumn('001'),
              marcColumn('100'),
              ...recordsWith100.map((record) => record.field005),
              ...recordsWith100.map((record) => record.field001),
              ...recordsWith100.map((record) => record.values100[0]),
            ]);

            // Step 9: Click "Actions" menu > "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();
            QueryModal.exists();
            QueryModal.verifySelectedField(marcFieldOption);
            QueryModal.verifyMarcTagValue('005');
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
            QueryModal.verifyMarcValueTextfield(currentYear);
            QueryModal.verifySelectedField(marcFieldOption, 1);
            QueryModal.verifyMarcTagValue('001', 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 1);
            QueryModal.verifySelectedValue('False', 1);
            QueryModal.verifySelectedField(marcFieldOption, 2);
            QueryModal.verifyMarcTagValue('100', 2);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 2);
            QueryModal.verifyMarcValueTextfield(`${marcPrefix}_`, 2);
            QueryModal.verifyQueryAreaContent(
              `(${marcColumn('005')} contains ${currentYear}) AND (${marcColumn('001')} is null/empty False) AND (${marcColumn('100')} contains ${marcPrefix}_)`,
            );
            QueryModal.testQueryDisabled(false);
            QueryModal.runQueryAndSaveDisabled();

            // Step 10: Remove the second and third conditions, search by marc_670 field
            QueryModal.clickGarbage(2);
            QueryModal.clickGarbage(1);
            QueryModal.fillInMarcTag('670');
            QueryModal.verifyMarcTagValue('670');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues();
            QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH);
            QueryModal.fillInMarcValueTextfield(sourceCitationSearchValue);
            QueryModal.verifyMarcValueTextfield(sourceCitationSearchValue);
            QueryModal.verifyQueryAreaContent(
              `(${marcColumn('670')} starts with ${sourceCitationSearchValue})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(5);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('670'));
            recordsWith670.forEach((record) => {
              QueryModal.verifyResultTableColumnValues(
                record.naturalId,
                marcColumn('670'),
                record.values670,
              );
            });
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(recordAD.naturalId);

            // Step 11: Search by marc_035 field using "is null/empty" operator with "True" value
            QueryModal.fillInMarcTag('035');
            QueryModal.verifyMarcTagValue('035');
            QueryModal.verifyMarcIndicatorsAndSubfieldValues();
            QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.selectValueFromSelect('True');
            QueryModal.verifySelectedValue('True');
            // "is null/empty True" matches every record without the queried field, so the second
            // condition narrows the result down to the records created in preconditions
            QueryModal.addNewRow();
            QueryModal.selectField(marcFieldOption, 1);
            QueryModal.fillInMarcTag('010', 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
            QueryModal.fillInMarcValueTextfield(naturalIdDigits, 1);
            QueryModal.verifyQueryAreaContent(
              `(${marcColumn('035')} is null/empty True) AND (${narrowingCondition})`,
            );
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyResultTableColumnDisplayed(marcColumn('035'));
            QueryModal.verifyResultTableColumnValues(recordAD.naturalId, marcColumn('035'), []);
            [recordAA, recordAB, recordAC, recordAE, recordAF].forEach((record) => {
              QueryModal.verifyRecordWithIdentifierAbsentInResultTable(record.naturalId);
            });
          });
        },
      );
    });
  });
});
