import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import DateTools from '../../../support/utils/dateTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', { retries: { runMode: 1 } }, () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C692115_MarcBibInstance_${randomPostfix}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        createdRecordId: null,
        userProperties: null,
        fieldsToUpdate: [
          { tag: '020', content: '$a testUpdate20', action: 'Edited' },
          { tag: '022', content: '$a testUpdate22', action: 'Edited' },
          { tag: '035', content: '$a testUpdate35', action: 'Edited' },
          { tag: '040', content: '$a testUpdate40', action: 'Edited' },
          { tag: '050', content: '$a testUpdate50', action: 'Edited' },
          { tag: '082', content: '$a testUpdate82', action: 'Edited' },
          { tag: '100', content: '$a testUpdate100', action: 'Edited' },
          { tag: '240', content: '$a testUpdate240', action: 'Edited' },
          { tag: '246', content: '$a testUpdate246', action: 'Edited' },
          { tag: '250', content: '$a testUpdate250', action: 'Edited' },
          { tag: '260', content: '$a testUpdate260', action: 'Edited' },
          { tag: '264', content: '$a testUpdate264', action: 'Edited' },
          { tag: '300', content: '$a testUpdate300', action: 'Edited' },
          { tag: '336', content: '$a testUpdate336', action: 'Edited' },
          { tag: '337', content: '$a testUpdate337', action: 'Edited' },
          { tag: '338', content: '$a testUpdate338', action: 'Edited' },
          { tag: '490', content: '$a testUpdate490', action: 'Edited' },
          { tag: '500', content: '$a testUpdate500', action: 'Edited' },
          { tag: '504', content: '$a testUpdate504', action: 'Edited' },
          { tag: '505', content: '$a testUpdate505', action: 'Edited' },
          { tag: '520', content: '$a testUpdate520', action: 'Edited' },
          { tag: '700', content: '$a testUpdate700', action: 'Edited' },
          { tag: '856', content: '$u testUpdate856', action: 'Edited' },
        ],
        repeatableFieldsToAdd: [
          { tag: '600', content: '$a testRepeatable600_26', action: 'Added' },
          { tag: '600', content: '$a testRepeatable600_27', action: 'Removed' },
          { tag: '600', content: '$a testRepeatable600_28', action: 'Edited' },
        ],
        ldrRegExp: /^\d{5}[a-zA-Z]{3}.{1}[a-zA-Z0-9]{8}.{3}4500$/,
      };

      const permissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];

      const marcBibFields = [
        {
          tag: '008',
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: '245',
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '0'],
        },
        {
          tag: '020',
          content: '$a original020',
          indicators: ['\\', '\\'],
        },
        {
          tag: '022',
          content: '$a original022',
          indicators: ['\\', '\\'],
        },
        {
          tag: '035',
          content: '$a original035',
          indicators: ['\\', '\\'],
        },
        {
          tag: '040',
          content: '$a original040',
          indicators: ['\\', '\\'],
        },
        {
          tag: '050',
          content: '$a original050',
          indicators: ['\\', '\\'],
        },
        {
          tag: '082',
          content: '$a original082',
          indicators: ['0', '0'],
        },
        {
          tag: '100',
          content: '$a original100',
          indicators: ['1', '\\'],
        },
        {
          tag: '240',
          content: '$a original240',
          indicators: ['1', '0'],
        },
        {
          tag: '246',
          content: '$a original246',
          indicators: ['3', '\\'],
        },
        {
          tag: '250',
          content: '$a original250',
          indicators: ['\\', '\\'],
        },
        {
          tag: '260',
          content: '$a original260',
          indicators: ['\\', '\\'],
        },
        {
          tag: '264',
          content: '$a original264',
          indicators: ['\\', '1'],
        },
        {
          tag: '300',
          content: '$a original300',
          indicators: ['\\', '\\'],
        },
        {
          tag: '336',
          content: '$a original336',
          indicators: ['\\', '\\'],
        },
        {
          tag: '337',
          content: '$a original337',
          indicators: ['\\', '\\'],
        },
        {
          tag: '338',
          content: '$a original338',
          indicators: ['\\', '\\'],
        },
        {
          tag: '490',
          content: '$a original490',
          indicators: ['0', '\\'],
        },
        {
          tag: '500',
          content: '$a original500',
          indicators: ['\\', '\\'],
        },
        {
          tag: '504',
          content: '$a original504',
          indicators: ['\\', '\\'],
        },
        {
          tag: '505',
          content: '$a original505',
          indicators: ['0', '\\'],
        },
        {
          tag: '520',
          content: '$a original520',
          indicators: ['\\', '\\'],
        },
        {
          tag: '600',
          content: '$a original650',
          indicators: ['\\', '0'],
        },
        {
          tag: '600',
          content: '$a original651',
          indicators: ['\\', '0'],
        },
        {
          tag: '600',
          content: '$a original652',
          indicators: ['\\', '0'],
        },
        {
          tag: '700',
          content: '$a original700',
          indicators: ['1', '\\'],
        },
        {
          tag: '856',
          content: '$u original856',
          indicators: ['4', '0'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testData.createdRecordId = instanceId;
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.createdRecordId);
              InventoryInstances.selectInstanceById(testData.createdRecordId);
              InventoryInstance.waitLoading();
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692115 Check "Version history" pane after Update of 20 unique fields of "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C692115'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          testData.fieldsToUpdate.forEach((field) => {
            QuickMarcEditor.updateExistingField(field.tag, field.content);
            cy.wait(100);
          });

          testData.repeatableFieldsToAdd.forEach((field) => {
            const rowIndex = parseInt(field.content.match(/\d+$/)[0], 10);
            QuickMarcEditor.updateExistingFieldContent(rowIndex, field.content);
            cy.wait(100);
          });

          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.waitLoading();

          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );

          testData.fieldsToUpdate.forEach((field) => {
            VersionHistorySection.checkChangeByTag(field.tag, field.action);
          });

          testData.repeatableFieldsToAdd.slice(0, 2).forEach((field) => {
            VersionHistorySection.checkChangeByTag(field.tag, field.action);
          });

          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );

          testData.fieldsToUpdate.forEach((field) => {
            const originalField = marcBibFields.find((f) => f.tag === field.tag);
            const fromContent = originalField ? originalField.content : undefined;
            const toContent = field.content;

            VersionHistorySection.checkChangeInModalWithIndicators(
              field.action,
              field.tag,
              originalField.indicators,
              fromContent,
              toContent,
            );
          });

          VersionHistorySection.verifyModalScrollbar();
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
