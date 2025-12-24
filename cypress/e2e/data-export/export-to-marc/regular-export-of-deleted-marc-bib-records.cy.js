/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SetRecordForDeletionModal from '../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  APPLICATION_NAMES,
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../support/constants';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DateTools from '../../../support/utils/dateTools';

let user;
let exportedFileName;
const numberOfInstances = 3;
let marcInstances;
let fileName;

describe(
  'Data Export',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Export to MARC', () => {
      beforeEach('create test data', () => {
        marcInstances = [...Array(numberOfInstances)].map(() => {
          const title = `AT_C494361_MarcInstance_${getRandomPostfix()}`;
          return {
            title,
            marcBibFields: [
              {
                tag: '008',
                content: {
                  Type: '\\',
                  BLvl: '\\',
                  DtSt: '\\',
                  Date1: '\\\\\\\\',
                  Date2: '\\\\\\\\',
                  Ctry: '\\\\\\',
                  Lang: 'eng',
                  MRec: '\\',
                  Srce: '\\',
                  Ills: ['\\', '\\', '\\', '\\'],
                  Audn: '\\',
                  Form: '\\',
                  Cont: ['\\', '\\', '\\', '\\'],
                  GPub: '\\',
                  Conf: '\\',
                  Fest: '\\',
                  Indx: '\\',
                  LitF: '\\',
                  Biog: '\\',
                },
              },
              {
                tag: '245',
                content: `$a ${title}`,
                indicators: ['1', '0'],
              },
            ],
          };
        });
        fileName = `AT_C494361_TestFile${getRandomPostfix()}.csv`;

        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.uiInventorySetRecordsForDeletion.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;

          marcInstances.forEach((instance) => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              instance.marcBibFields,
            ).then((instanceId) => {
              instance.uuid = instanceId;

              FileManager.appendFile(`cypress/fixtures/${fileName}`, `${instance.uuid}\n`);
            });
          });
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        marcInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
        FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      });

      it(
        'C494361 Regular export of deleted MARC bib records (firebird)',
        { tags: ['smoke', 'firebird', 'C494361'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(marcInstances[0].title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyEditInstanceButtonIsEnabled();
          InstanceRecordView.setRecordForDeletion();
          SetRecordForDeletionModal.waitLoading();
          SetRecordForDeletionModal.verifyModalView(marcInstances[0].title);
          SetRecordForDeletionModal.clickConfirm();
          InstanceRecordView.verifyInstanceIsSetForDeletion();

          const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
          const currentTimestampUpToMinutesOneMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);

          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstances[1].title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.selectFieldsDropdownOption(
            'LDR',
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.D,
          );
          QuickMarcEditor.pressSaveAndClose();
          InstanceRecordView.verifyInstanceIsSetForDeletion();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstances[2].title);
          InstanceRecordView.edit();
          InstanceRecordEdit.clickSetForDeletionCheckbox(true);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstanceIsSetForDeletion();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();
          ExportFileHelper.uploadFile(fileName);
          ExportFileHelper.exportWithDefaultJobProfile(fileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            const recordsCount = numberOfInstances;
            exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              user.username,
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            const commonAssertions = (instance) => [
              (record) => expect(record.leader[5]).to.equal('d'),
              (record) => {
                expect(
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },
              (record) => expect(record.get('245')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('245')[0].subf[0][1]).to.eq(instance.title),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.uuid),
              (record) => expect(record.get('999')[0].subf[1][0]).to.eq('s'),
              (record) => expect(record.get('999')[0].subf[1][1]).to.be.a('string'),
            ];
            const recordsToVerify = marcInstances.map((instance) => ({
              uuid: instance.uuid,
              assertions: commonAssertions(instance),
            }));

            parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
          });
        },
      );
    });
  },
);
