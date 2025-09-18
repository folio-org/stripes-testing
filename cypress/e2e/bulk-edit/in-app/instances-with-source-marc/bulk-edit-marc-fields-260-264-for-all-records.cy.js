import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  publicationTableHeaders,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
} from '../../../../support/constants';

let user;
const marcInstance = {
  title: `AT_C773212_MarcInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const EXPECTED_PUBLICATIONS = [
  {
    publisher: 'U.S. Dept. of Energy,',
    role: '-',
    place: 'Oak Ridge, Tenn. :',
    date: 'April 15, 1977.',
  },
  {
    publisher: 'Xerox Films,',
    role: 'Production',
    place: 'New York :',
    date: '1973.',
  },
  {
    publisher: 'ABC Publishers,',
    role: 'Publication',
    place: '[Place of publication not identified] :',
    date: '2009.',
  },
  {
    publisher: 'Iverson Company',
    role: 'Distribution',
    place: 'Seattle :',
    date: '-',
  },
  {
    publisher: 'Kinsey Printing Company',
    role: 'Manufacture',
    place: 'Cambridge :',
    date: '-',
  },
  {
    publisher: '-',
    role: '-',
    place: '-',
    date: '©2002',
  },
];
const verifyAllPublicationsInForm = (formType) => {
  EXPECTED_PUBLICATIONS.forEach((publication) => {
    BulkEditSearchPane.verifyPublicationTableInForm(
      formType,
      marcInstance.hrid,
      publication.publisher,
      publication.role,
      publication.place,
      publication.date,
    );
  });
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '260',
    content: '$a Oak Ridge, Tenn. : $b U.S. Dept. of Energy,$c1977.',
    indicators: ['\\', '\\'],
  },
];

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    beforeEach('create test data', () => {
      cy.clearLocalStorage();

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.uuid);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          },
        );
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
      });
    });

    afterEach('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    // Trillium
    it.skip(
      'C773212 Bulk edit marc fields (260, 264) for all records (MARC) (firebird)',
      { tags: [] },
      () => {
        // Step 1: Click "Actions" menu and check "Publication" checkbox
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          true,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyPublicationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstance.hrid,
          'U.S. Dept. of Energy',
          '-',
          'Oak Ridge, Tenn.',
          '1977',
        );

        // Step 2: Click "Actions" menu and uncheck "Publication" checkbox
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          false,
        );

        // Step 3: Click "Actions" menu and select "Instances with source MARC" option
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: Add first 264 field (264 \0)
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('264', '\\', '0', 'a');
        BulkEditActions.addSubfieldActionForMarc('New York :');
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
        BulkEditActions.fillInSubfieldInSubRow('b');
        BulkEditActions.fillInDataInSubRow('Xerox Films,');
        BulkEditActions.selectActionInSubRow('Additional subfield', 0, 0);
        BulkEditActions.fillInSubfieldInSubRow('c', 0, 1);
        BulkEditActions.fillInDataInSubRow('1973.', 0, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add second 264 field (264 \1)
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('264', '\\', '1', 'a', 1);
        BulkEditActions.addSubfieldActionForMarc('[Place of publication not identified] :', 1);
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 1);
        BulkEditActions.fillInSubfieldInSubRow('b', 1);
        BulkEditActions.fillInDataInSubRow('ABC Publishers,', 1);
        BulkEditActions.selectActionInSubRow('Additional subfield', 1, 0);
        BulkEditActions.fillInSubfieldInSubRow('c', 1, 1);
        BulkEditActions.fillInDataInSubRow('2009.', 1, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Add third 264 field (264 \2)
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('264', '\\', '2', 'a', 2);
        BulkEditActions.addSubfieldActionForMarc('Seattle :', 2);
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 2);
        BulkEditActions.fillInSubfieldInSubRow('b', 2);
        BulkEditActions.fillInDataInSubRow('Iverson Company', 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Add fourth 264 field (264 \3)
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('264', '\\', '3', 'a', 3);
        BulkEditActions.addSubfieldActionForMarc('Cambridge :', 3);
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 3);
        BulkEditActions.fillInSubfieldInSubRow('b', 3);
        BulkEditActions.fillInDataInSubRow('Kinsey Printing Company', 3);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Add fifth 264 field (264 \4)
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(3);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('264', '\\', '4', 'c', 4);
        BulkEditActions.addSubfieldActionForMarc('©2002', 4);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Modify existing 260 field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(4);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('260', '\\', '\\', 'c', 5);
        BulkEditActions.findAndReplaceWithActionForMarc('1977', 'April 15, 1977', 5);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 10: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);

        // Verify all publications in "Are you sure" form
        verifyAllPublicationsInForm(BULK_EDIT_FORMS.ARE_YOU_SURE);

        // Step 11: Download preview in MARC format
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.uuid,
            assertions: [
              // Verify 260 field: 260 \\ $aOak Ridge, Tenn. :$bU.S. Dept. of Energy,$cApril 15, 1977.
              (record) => {
                const field260 = record.get('260')[0];
                expect(field260.ind1).to.eq(' ');
                expect(field260.ind2).to.eq(' ');
                expect(field260.subf[0][0]).to.eq('a');
                expect(field260.subf[0][1]).to.eq('Oak Ridge, Tenn. :');
                expect(field260.subf[1][0]).to.eq('b');
                expect(field260.subf[1][1]).to.eq('U.S. Dept. of Energy,');
                expect(field260.subf[2][0]).to.eq('c');
                expect(field260.subf[2][1]).to.eq('April 15, 1977.');
              },
              // First 264 field: 264 \0 $aNew York :$bXerox Films,$c1973.
              (record) => {
                const firstField264 = record.get('264')[0];
                expect(firstField264.ind1).to.eq(' ');
                expect(firstField264.ind2).to.eq('0');
                expect(firstField264.subf[0][0]).to.eq('a');
                expect(firstField264.subf[0][1]).to.eq('New York :');
                expect(firstField264.subf[1][0]).to.eq('b');
                expect(firstField264.subf[1][1]).to.eq('Xerox Films,');
                expect(firstField264.subf[2][0]).to.eq('c');
                expect(firstField264.subf[2][1]).to.eq('1973.');
              },
              // Second 264 field: 264 \1 $a[Place of publication not identified] : $bABC Publishers, $c2009.
              (record) => {
                const secondField264 = record.get('264')[1];
                expect(secondField264.ind1).to.eq(' ');
                expect(secondField264.ind2).to.eq('1');
                expect(secondField264.subf[0][0]).to.eq('a');
                expect(secondField264.subf[0][1]).to.eq('[Place of publication not identified] :');
                expect(secondField264.subf[1][0]).to.eq('b');
                expect(secondField264.subf[1][1]).to.eq('ABC Publishers,');
                expect(secondField264.subf[2][0]).to.eq('c');
                expect(secondField264.subf[2][1]).to.eq('2009.');
              },
              // Third 264 field: 264 \2 $aSeattle : $bIverson Company
              (record) => {
                const thirdField264 = record.get('264')[2];
                expect(thirdField264.ind1).to.eq(' ');
                expect(thirdField264.ind2).to.eq('2');
                expect(thirdField264.subf[0][0]).to.eq('a');
                expect(thirdField264.subf[0][1]).to.eq('Seattle :');
                expect(thirdField264.subf[1][0]).to.eq('b');
                expect(thirdField264.subf[1][1]).to.eq('Iverson Company');
              },
              // Fourth 264 field: 264 \3 $aCambridge : $bKinsey Printing Company
              (record) => {
                const fourthField264 = record.get('264')[3];
                expect(fourthField264.ind1).to.eq(' ');
                expect(fourthField264.ind2).to.eq('3');
                expect(fourthField264.subf[0][0]).to.eq('a');
                expect(fourthField264.subf[0][1]).to.eq('Cambridge :');
                expect(fourthField264.subf[1][0]).to.eq('b');
                expect(fourthField264.subf[1][1]).to.eq('Kinsey Printing Company');
              },
              // Fifth 264 field: 264 \4 $c©2002
              (record) => {
                const fifthField264 = record.get('264')[4];
                expect(fifthField264.ind1).to.eq(' ');
                expect(fifthField264.ind2).to.eq('4');
                expect(fifthField264.subf[0][0]).to.eq('c');
                expect(fifthField264.subf[0][1]).to.eq('©2002');
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 12: Download preview in CSV format
        BulkEditActions.downloadPreview();

        const publicationCsvHeaders = publicationTableHeaders.join(';');
        const publicationCsvData =
          'U.S. Dept. of Energy,;-;Oak Ridge, Tenn. :;April 15, 1977. | Xerox Films,;Production;New York :;1973. | ABC Publishers,;Publication;[Place of publication not identified] :;2009. | Iverson Company;Distribution;Seattle :;- | Kinsey Printing Company;Manufacture;Cambridge :;- | -;-;-;©2002';

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          `${publicationCsvHeaders}\n${publicationCsvData}`,
        );

        // Step 13: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);

        // Verify all publications in "Preview of records changed" form
        verifyAllPublicationsInForm(BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED);

        // Step 14: Download changed records (MARC)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 15: Download changed records (CSV)
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          `${publicationCsvHeaders}\n${publicationCsvData}`,
        );

        // Step 16: Navigate to Inventory and verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InstanceRecordView.waitLoading();

        EXPECTED_PUBLICATIONS.forEach((publication, index) => {
          InstanceRecordView.verifyPublisher(
            {
              publisher: publication.publisher.replace(/,$/, '').trim(),
              role: publication.role,
              place: publication.place.replace(/:$/, '').trim(),
              date: publication.date.replace(/.$/, '').trim(),
            },
            index,
          );
        });

        // Step 17: View source to verify MARC record changes
        InventoryInstance.viewSource();
        InventoryViewSource.waitLoading();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '260',
          '\t260\t   \t$a Oak Ridge, Tenn. : $b U.S. Dept. of Energy, $c April 15, 1977.',
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '264',
          '\t264\t  0\t$a New York : $b Xerox Films, $c 1973.',
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '264',
          '\t264\t  1\t$a [Place of publication not identified] : $b ABC Publishers, $c 2009.',
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '264',
          '\t264\t  2\t$a Seattle : $b Iverson Company',
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '264',
          '\t264\t  3\t$a Cambridge : $b Kinsey Printing Company',
        );
        InventoryViewSource.verifyFieldInMARCBibSource('264', '\t264\t  4\t$c ©2002');
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
