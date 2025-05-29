import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  INSTANCE_NOTE_IDS,
  INSTANCE_RESOURCE_TYPE_IDS,
  INSTANCE_STATUS_TERM_IDS,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  instanceFieldValues,
  STRING_OPERATORS,
} from '../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let identifiersQueryFileName;
let matchedRecordsFileName;
let previewFileName;
let changedRecordsFileName;
let errorsFromCommittingFileName;
const randomNumberForTitles = getRandomPostfix();
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {};
const folioFields = {
  title: `${randomNumberForTitles} Test Instance notes - Staff only FOLIO`,
  instanceTypeId: INSTANCE_RESOURCE_TYPE_IDS.TEXT,
  notes: [
    {
      instanceNoteTypeId: INSTANCE_NOTE_IDS.ACTION_NOTE,
      note: `Action note FOLIO ${getRandomPostfix()}`,
      staffOnly: false,
    },
    {
      instanceNoteTypeId: INSTANCE_NOTE_IDS.REPRODUCTION_NOTE,
      note: `Reproduction note FOLIO ${getRandomPostfix()}`,
      staffOnly: true,
    },
  ],
};
const marcFields = {
  245: `${randomNumberForTitles} Test Instance notes - Staff only MARC`,
  533: `Reproduction note MARC ${getRandomPostfix()}`,
  583: `Action note MARC ${getRandomPostfix()}`,
};
const marcInstanceBody = {
  externalId: '00000000-0000-0000-0000-000000000000',
  fields: [
    {
      tag: '008',
      content: {
        Type: 'a',
        BLvl: 's',
        DtSt: '|',
        Date1: '\\\\\\\\',
        Date2: '\\\\\\\\',
        Ctry: '\\\\\\',
        Audn: '\\',
        Form: '\\',
        Cont: ['\\', '\\', '\\'],
        GPub: '\\',
        Conf: '|',
        Fest: '\\',
        Indx: '\\',
        LitF: '\\',
        Biog: '\\',
        Lang: '\\\\\\',
        MRec: '\\',
        Srce: '\\',
        Freq: '\\',
        Orig: '\\',
        'S/L': '|',
        Regl: '|',
        SrTp: '\\',
        EntW: '\\',
        Alph: '\\',
      },
    },
    {
      tag: '245',
      content: `$a ${marcFields[245]}`,
      indicators: ['0', '1'],
    },
    {
      tag: '533',
      content: `$a ${marcFields[533]}`,
      indicators: ['\\', '\\'],
    },
    {
      tag: '583',
      content: `$a ${marcFields[583]}`,
      indicators: ['\\', '\\'],
    },
  ],
  leader: '00000nas\\a2200000uu\\4500',
  marcFormat: 'BIBLIOGRAPHIC',
  parsedRecordDtoId: '00000000-0000-0000-0000-000000000000',
  parsedRecordId: uuid(),
  relatedRecordVersion: 1,
  suppressDiscovery: false,
  updateInfo: { recordState: 'NEW' },
  _actionType: 'create',
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        folioItem.instanceId = InventoryInstances.createInstanceViaApi(
          folioItem.instanceName,
          folioItem.itemBarcode,
        );
        InventoryInstances.createMarcBibViaApi(marcInstanceBody);
        cy.getInstanceById(folioItem.instanceId).then((body) => {
          body.title = folioFields.title;
          body.shared = false;
          body.statusId = INSTANCE_STATUS_TERM_IDS.CATALOGED;
          body.notes = folioFields.notes;
          body.instanceTypeId = folioFields.instanceTypeId;
          cy.updateInstance(body);
        });
        cy.wait(2000);
        cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${marcFields[245]}"` })
          .then((instance) => {
            marcInstance.instanceId = instance.id;
          })
          .then(() => {
            cy.getInstanceById(marcInstance.instanceId).then((body) => {
              body.statusId = INSTANCE_STATUS_TERM_IDS.CATALOGED;
              cy.updateInstance(body);
            });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
      FileManager.deleteFileFromDownloadsByMask(
        identifiersQueryFileName,
        matchedRecordsFileName,
        previewFileName,
        errorsFromCommittingFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C466313 Bulk edit Instance fields - mark as staff only and remove mark as staff only (firebird)',
      { tags: ['criticalPath', 'firebird', 'C466313'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
        QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
        QueryModal.fillInValueTextfield(
          `${randomNumberForTitles} Test Instance notes - Staff only`,
        );
        cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();

        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        BulkEditActions.downloadMatchedResults();
        cy.wait('@getPreview').then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          identifiersQueryFileName = `*Query-${interceptedUuid}.csv`;
          cy.wrap(identifiersQueryFileName).as('identifiersQueryFileName');
          matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
          cy.wrap(matchedRecordsFileName).as('matchedRecordsFileName');
          previewFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
          cy.wrap(previewFileName).as('previewFileName');
          changedRecordsFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
          cy.wrap(changedRecordsFileName).as('changedRecordsFileName');
          errorsFromCommittingFileName = `*-Committing-changes-Errors-Query-${interceptedUuid}.csv`;
          cy.wrap(errorsFromCommittingFileName).as('errorsFromCommittingFileName');
        });
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Instance UUID',
          'Action note',
          'Reproduction note',
        );
        BulkEditSearchPane.verifySpecificItemsMatched(
          folioItem.instanceId,
          marcInstance.instanceId,
        );
        cy.get('@matchedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [folioItem.instanceId, marcInstance.instanceId]);
        });
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.markAsStaffOnly('Action note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.removeMarkAsStaffOnly('Reproduction note', 1);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioItem.instanceId,
          'Action note',
          `${folioFields.notes[0].note} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioItem.instanceId,
          'Reproduction note',
          `${folioFields.notes[1].note}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.instanceId,
          'Action note',
          `${marcFields[583]} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.instanceId,
          'Reproduction note',
          `${marcFields[533]}`,
          folioItem.instanceId,
        );
        BulkEditActions.downloadPreview();
        cy.get('@previewFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [
            `Action note;${folioFields.notes[0].note};true|Reproduction note;${folioFields.notes[1].note};false`,
            `Reproduction note;${marcFields[533]};false|Action note;${marcFields[583]};true`,
          ]);
        });
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(folioItem.instanceId);
        BulkEditSearchPane.verifyReasonForError(
          'Bulk edit of instance notes is not supported for MARC Instances.',
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditActions.downloadErrors();
        cy.get('@changedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [
            `Action note;${folioFields.notes[0].note};true|Reproduction note;${folioFields.notes[1].note};false`,
          ]);
        });
        cy.get('@changedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(
            fileName,
            [`Reproduction note;${marcFields[533]};true|Action note;${marcFields[583]};false`],
            false,
          );
        });
        cy.get('@errorsFromCommittingFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [marcInstance.instanceId]);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        let notesToCheck = [
          {
            rowIndex: 0,
            staffOnly: 'Yes',
            noteType: 'Action note',
            noteText: folioFields.notes[0].note,
          },
          {
            rowIndex: 1,
            staffOnly: 'No',
            noteType: 'Reproduction note',
            noteText: folioFields.notes[1].note,
          },
        ];

        notesToCheck.forEach((note) => {
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            note.rowIndex,
            note.staffOnly,
            note.noteType,
            note.noteText,
          );
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.byKeywords(marcInstance.instanceId);
        cy.wait(1000);
        InventoryInstance.waitLoading();
        notesToCheck = [
          { rowIndex: 0, staffOnly: 'No', noteType: 'Action note', noteText: marcFields[583] },
          {
            rowIndex: 1,
            staffOnly: 'No',
            noteType: 'Reproduction note',
            noteText: marcFields[533],
          },
        ];

        notesToCheck.forEach((note) => {
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            note.rowIndex,
            note.staffOnly,
            note.noteType,
            note.noteText,
          );
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

        BulkEditLogs.downloadQueryIdentifiers();
        cy.get('@identifiersQueryFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [folioItem.instanceId, marcInstance.instanceId]);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });

        BulkEditLogs.downloadFileWithMatchingRecords();
        cy.get('@matchedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [folioItem.instanceId, marcInstance.instanceId]);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });

        BulkEditLogs.downloadFileWithProposedChanges();
        cy.get('@previewFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [
            `Action note;${folioFields.notes[0].note};true|Reproduction note;${folioFields.notes[1].note};false`,
            `Reproduction note;${marcFields[533]};false|Action note;${marcFields[583]};true`,
          ]);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });

        BulkEditLogs.downloadFileWithUpdatedRecords();
        cy.get('@changedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [
            `Action note;${folioFields.notes[0].note};true|Reproduction note;${folioFields.notes[1].note};false`,
          ]);
          ExportFile.verifyFileIncludes(
            fileName,
            [`Reproduction note;${marcFields[533]};true|Action note;${marcFields[583]};false`],
            false,
          );
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });

        BulkEditLogs.downloadFileWithCommitErrors();
        cy.get('@errorsFromCommittingFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [marcInstance.instanceId]);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      },
    );
  });
});
