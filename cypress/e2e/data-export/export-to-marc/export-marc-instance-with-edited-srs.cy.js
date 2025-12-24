/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
let exportedFileName;
let secondExportedFileName;
let firstJobHrid;
const marcInstanceUUIDFileName = `AT_C446023_marcInstanceUUIDFile_${getRandomPostfix()}.csv`;
const recordsCount = 1;
const marcFile = {
  marc: 'marcBibFileC446023.mrc',
  fileNameImported: `testMarcFileC446023.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcInstance = {
  title: `AT_C446023_MarcInstance_${randomFourDigitNumber()}`,
};
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
const expectedMarcFields = [
  ['007', 'sd fzngnn|||ed'],
  ['008', '891208p19831982nyumun              zxx d'],
  ['028', '02', 'a', '60035-2-RG', 'b', 'RCA Victor Gold Seal'],
  ['035', '  ', 'a', '(OCoLC)20752060'],
  ['035', '  ', 'a', '(ICU)in6322481'],
  ['040', '  ', 'a', 'UUP', 'c', 'UUP', 'd', 'OCL', 'd', 'OCLCQ', 'd', 'UtOrBLW'],
  ['049', '  ', 'a', 'CGUA'],
  ['050', ' 4', 'a', 'M1024', 'b', '.W43 Op. 73 1983'],
  ['100', '1 ', 'a', 'Weber, Carl Maria von,', 'd', '1786-1826.'],
  [
    '240',
    '10',
    'a',
    'Concertos,',
    'm',
    'clarinet, orchestra,',
    'n',
    'no. 1, op. 73,',
    'r',
    'F minor',
  ],
  [
    '245',
    '10',
    'a',
    'C446023 Clarinet concerto no. 1, op. 73',
    'h',
    '[sound recording] /',
    'c',
    'Weber. Andante, K. 315 / Mozart. Theme & variations / Rossini.',
  ],
  ['260', '  ', 'a', 'New York, N.Y. :', 'b', 'RCA Victor Gold Seal,', 'c', 'p1983.'],
  ['300', '  ', 'a', '1 sound disc (43 min.) :', 'b', 'digital ;', 'c', '4 3/4 in.'],
  ['500', '  ', 'a', 'Compact disc.'],
  [
    '511',
    '0 ',
    'a',
    'Richard Stoltzman, clarinet ; Mostly Mozart Festival Orchestra ; Alexander Schneider, conductor.',
  ],
  ['518', '  ', 'a', 'Recorded in 1982.'],
  ['650', ' 0', 'a', 'Concertos (Clarinet)'],
  ['650', ' 0', 'a', 'Clarinet with orchestra, Arranged.'],
  ['700', '1 ', 'a', 'Stoltzman, Richard.', '4', 'itr'],
  ['711', '2 ', 'a', 'Mostly Festival.', 'e', 'Orch.', '4', 'prf', 'v', 'version 1'],
  ['903', '  ', 'a', 'MARS'],
];

describe('Data Export', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.fileNameImported,
        marcFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          marcInstance.id = record.instance.id;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;
          });

          FileManager.createFile(`cypress/fixtures/${marcInstanceUUIDFileName}`, marcInstance.id);
        });
      });

      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(marcInstance.id);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${marcInstanceUUIDFileName}`);
    FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    FileManager.deleteFileFromDownloadsByMask(secondExportedFileName);
  });

  it(
    'C446023 Verify export MARC Instance with edited SRS (firebird)',
    { tags: ['criticalPath', 'firebird', 'C446023'] },
    () => {
      // Step 1-2: Upload the .csv file
      ExportFileHelper.uploadFile(marcInstanceUUIDFileName);
      ExportFileHelper.exportWithDefaultJobProfile(
        marcInstanceUUIDFileName,
        'Default instances',
        'Instances',
      );
      DataExportLogs.verifyAreYouSureModalAbsent();

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        firstJobHrid = jobData.hrId;
        exportedFileName = `${marcInstanceUUIDFileName.replace('.csv', '')}-${firstJobHrid}.mrc`;

        DataExportResults.verifySuccessExportResultCells(
          exportedFileName,
          recordsCount,
          firstJobHrid,
          user.username,
          'Default instances',
        );
        cy.getUserToken(user.username, user.password);

        // Step 3: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
        DataExportLogs.clickButtonWithText(exportedFileName);

        // Step 4: Check exported records included in the file
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              (record) => expect(record.leader).to.exist,
              (record) => {
                expect(record.fields[0]).to.deep.eq(['001', marcInstance.hrid]);
              },
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
              ...expectedMarcFields.map((fieldData, index) => (record) => {
                expect(record.fields[index + 2]).to.deep.eq(fieldData);
              }),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.id);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          exportedFileName,
          assertionsOnMarcFileContent,
          recordsCount,
          false,
        );
      });

      // Step 5: Go to "Inventory" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      cy.wait(5000);
      InventorySearchAndFilter.waitLoading();

      // Step 6: Find MARC Instance from Preconditions
      InventorySearchAndFilter.searchInstanceByTitle(marcInstance.id);
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();

      // Step 7: Click "Actions" => "Edit MARC bibliographic record"
      InventoryInstance.goToEditMARCBiblRecord();

      // Step 8: Edit any field of MARC bibliographic record, e.g. 245 field
      QuickMarcEditor.updateExistingField('245', `$a ${marcInstance.title}`);

      // Create updated version of expectedMarcFields with new 245 field
      const updatedExpectedMarcFields = [...expectedMarcFields];
      const index245 = updatedExpectedMarcFields.findIndex((field) => field[0] === '245');
      updatedExpectedMarcFields[index245] = ['245', '10', 'a', marcInstance.title];

      // Step 9: Click "Save & close" button
      QuickMarcEditor.saveAndCloseWithValidationWarnings();
      QuickMarcEditor.checkAfterSaveAndClose();

      // Step 10: Go to "Data export" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

      // Step 11: Trigger the data export by submitting .csv file with UUID of inventory instance from Preconditions
      ExportFileHelper.uploadFile(marcInstanceUUIDFileName);
      ExportFileHelper.exportWithDefaultJobProfile(
        marcInstanceUUIDFileName,
        'Default instances',
        'Instances',
      );
      DataExportLogs.verifyAreYouSureModalAbsent();
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo2');
      cy.wait('@getInfo2', getLongDelay()).then(({ response }) => {
        const jobs = response.body.jobExecutions;
        const jobData = jobs.find(
          (job) => job.runBy.userId === user.userId && job.hrId !== firstJobHrid,
        );
        const jobId = jobData.hrId;
        secondExportedFileName = `${marcInstanceUUIDFileName.replace('.csv', '')}-${jobId}.mrc`;

        DataExportResults.verifySuccessExportResultCells(
          secondExportedFileName,
          recordsCount,
          jobId,
          user.username,
          'Default instances',
        );

        // Step 12: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
        DataExportLogs.clickButtonWithText(secondExportedFileName);

        const assertionsOnUpdatedMarcFileContent = [
          {
            uuid: marcInstance.id,
            assertions: [
              (record) => expect(record.leader).to.exist,
              (record) => {
                expect(record.fields[0]).to.deep.eq(['001', marcInstance.hrid]);
              },
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
              ...updatedExpectedMarcFields.map((fieldData, index) => (record) => {
                expect(record.fields[index + 2]).to.deep.eq(fieldData);
              }),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => {
                expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.id);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          secondExportedFileName,
          assertionsOnUpdatedMarcFileContent,
          recordsCount,
          false,
        );
      });
    },
  );
});
