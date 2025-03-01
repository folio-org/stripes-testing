import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      user: {},
      field245: {
        tag: '245',
        content: '$a C584480 Testing Subjects',
      },
      fields: [
        // {
        //   tag: '008',
        //   content: ''
        // },
        {
          rowIndex: 4,
          tag: '600',
          content: '$a Test 600.2 subject', //  600 \ 0 $a Test 600.2 subject
          indicator0: '\\',
          indicator1: '0',
        },
        {
          rowIndex: 5,
          tag: '610',
          content: '$f Test 610 subject', //  610  \ 2 $f Test 610 subject
          indicator0: '\\',
          indicator1: '2',
        },
        {
          rowIndex: 6,
          tag: '611',
          content: '$f Test 611 subject', //  611  \ 3 $f Test 611 subject
          indicator0: '\\',
          indicator1: '3',
        },
        {
          rowIndex: 7,
          tag: '630',
          content: '$a Test 630 subject', //  630  \ 4 $a Test 630 subject
          indicator0: '\\',
          indicator1: '4',
        },
        {
          rowIndex: 8,
          tag: '647',
          content: '$a Test 647 subject', //  647  \ 5 $a Test 647 subject
          indicator0: '\\',
          indicator1: '5',
        },
        {
          rowIndex: 9,
          tag: '648',
          content: '$a Test 648 subject', //  648  \ 5 $a Test 648 subject
          indicator0: '\\',
          indicator1: '5',
        },
        {
          rowIndex: 10,
          tag: '650',
          content: '$a Test 650 subject', //  650  \ 6 $a Test 650 subject
          indicator0: '\\',
          indicator1: '6',
        },
        {
          rowIndex: 11,
          tag: '651',
          content: '$a Test 651 subject', //  651  \ 1 $a Test 651 subject
          indicator0: '\\',
          indicator1: '1',
        },
        {
          rowIndex: 12,
          tag: '655',
          content: '$a Test 655 subject', //  655  \ 7 $a Test 655 subject
          indicator0: '\\',
          indicator1: '7',
        },
      ],
    };

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C584480 Create new MARC source Instance with subject types/sources using Inventory app (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584480'] },
      () => {
        const expectedSubjects = [
          {
            indexRow: 0,
            subjectHeadings: 'Test 600.2 subject',
            subjectSource: 'Library of Congress Subject Headings',
            subjectType: 'Personal name',
          },
          {
            indexRow: 1,
            subjectHeadings: 'Test 610 subject',
            subjectSource: 'Medical Subject Headings',
            subjectType: 'Corporate name',
          },
          {
            indexRow: 2,
            subjectHeadings: 'Test 611 subject',
            subjectSource: 'National Agricultural Library subject authority file',
            subjectType: 'Meeting name',
          },
          {
            indexRow: 3,
            subjectHeadings: 'Test 630 subject',
            subjectSource: 'Source not specified',
            subjectType: 'Uniform title',
          },
          {
            indexRow: 4,
            subjectHeadings: 'Test 647 subject',
            subjectSource: 'Canadian Subject Headings',
            subjectType: 'Named event',
          },
          {
            indexRow: 5,
            subjectHeadings: 'Test 648 subject',
            subjectSource: 'Canadian Subject Headings',
            subjectType: 'Chronological term',
          },
          {
            indexRow: 6,
            subjectHeadings: 'Test 650 subject',
            subjectSource: 'Répertoire de vedettes-matière',
            subjectType: 'Topical term',
          },
          {
            indexRow: 7,
            subjectHeadings: 'Test 651 subject',
            subjectSource: "Library of Congress Children's and Young Adults' Subject Headings",
            subjectType: 'Geographic name',
          },
          {
            indexRow: 8,
            subjectHeadings: 'Test 655 subject',
            subjectSource: '-',
            subjectType: 'Genre / form',
          },
        ];

        InventoryInstances.createNewMarcBibRecord();
        QuickMarcEditor.updateExistingField(testData.field245.tag, testData.field245.content);
        testData.fields.forEach(({ rowIndex, tag, content, indicator0, indicator1 }) => {
          QuickMarcEditor.addEmptyFields(rowIndex);
          QuickMarcEditor.addValuesToExistingField(rowIndex, tag, content, indicator0, indicator1);
        });
        QuickMarcEditor.saveAndCloseWithValidationWarnings();
        cy.pause();
        QuickMarcEditor.checkAfterSaveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
        expectedSubjects.forEach(({ indexRow, subjectHeadings, subjectSource, subjectType }) => {
          InstanceRecordView.verifyInstanceSubject(
            indexRow,
            subjectHeadings,
            subjectSource,
            subjectType,
          );
        });
      },
    );
  });
});
