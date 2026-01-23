import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', { retries: { runMode: 1 } }, () => {
      let randomPostfix;
      let testData;
      let versionHistorySourceCardsData;
      let changesModalSourceData;
      let versionHistoryViewCardsData;
      let changesModalViewData;
      let permissions;
      let marcFile;

      beforeEach('Create test data', () => {
        randomPostfix = getRandomPostfix();
        testData = {
          instanceTitle: 'AT_C692081_MarcBibInstance',
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
          addedFields: [
            {
              tag: '700',
              content: ['1', '\\', '$a Acuña, Daniel, $e letterer. $0 no2013110205'],
              indexAbove: 81,
            },
            {
              tag: '700',
              content: ['1', '\\', '$a Neilson, Donald, $d 1936-2011 $0 n79023811'],
              indexAbove: 81,
            },
          ],
          updatedFields: [
            {
              index: 76,
              tag: '700',
              content: [
                '1',
                '\\',
                '$a Stelfreeze, Brian $e artist, $e author, $e narrator $0 id.loc.gov/authorities/names/n91065740',
              ],
            },
            {
              index: 80,
              tag: '700',
              content: [
                '1',
                '\\',
                '$a Lee, Stan, $d 1922-2018 $e Comics creator, $e author of comics $0 id.loc.gov/authorities/names/n83169267',
              ],
            },
            { index: 81, tag: '700', content: ['1', '\\', '$a Kirby, Jack, $0 n77020008'] },
          ],
          deletedFields: [
            { index: 74, tag: '655' },
            { index: 75, tag: '655' },
          ],
          ldrRegExp: /^\d{5}[a-zA-Z]{3}.{1}[a-zA-Z0-9]{8}.{3}4500$/,
        };
        versionHistorySourceCardsData = [
          {
            isOriginal: false,
            isCurrent: true,
            changes: [
              { text: 'Field 700', action: VersionHistorySection.fieldActions.ADDED },
              { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
              { text: 'Field 655', action: VersionHistorySection.fieldActions.REMOVED },
              { text: 'Field 700', action: VersionHistorySection.fieldActions.REMOVED },
            ],
          },
          { isOriginal: true, isCurrent: false },
        ];
        changesModalSourceData = [
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Stelfreeze, Brian $e artist, $e author, $e narrator $0 id.loc.gov/authorities/names/n91065740',
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Acuña, Daniel, $e letterer. $0 no2013110205',
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Kirby, Jack, $0 n77020008',
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Lee, Stan, $d 1922-2018 $e Comics creator, $e author of comics $0 id.loc.gov/authorities/names/n83169267',
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Neilson, Donald, $d 1936-2011 $0 n79023811',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '655',
            from: ' 7 $a Bandes dessinées de superhéros. $2 rvmgf',
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '655',
            from: ' 7 $a Bandes dessinées. $2 rvmgf',
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '700',
            from: '1  $a Stelfreeze, Brian $e artist. $0 id.loc.gov/authorities/names/n91065740',
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '700',
            from: '1  $a Lee, Stan, $d 1922-2018 $e creator, $e author $0 id.loc.gov/authorities/names/n83169267',
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '700',
            from: '1  $a Kirby, Jack, $e creator. $e author $0 n77020008',
            to: undefined,
          },
        ];
        versionHistoryViewCardsData = [
          {
            isOriginal: false,
            isCurrent: true,
            changes: [
              { text: 'Contributors', action: VersionHistorySection.fieldActions.ADDED },
              { text: 'Contributors', action: VersionHistorySection.fieldActions.ADDED },
              { text: 'Contributors', action: VersionHistorySection.fieldActions.ADDED },
              { text: 'Contributors', action: VersionHistorySection.fieldActions.ADDED },
              { text: 'Contributors', action: VersionHistorySection.fieldActions.REMOVED },
              { text: 'Contributors', action: VersionHistorySection.fieldActions.REMOVED },
              { text: 'Subjects', action: VersionHistorySection.fieldActions.REMOVED },
              { text: 'Subjects', action: VersionHistorySection.fieldActions.REMOVED },
            ],
          },
          { isOriginal: true, isCurrent: false },
        ];
        changesModalViewData = [
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: 'Contributors',
            from: undefined,
            to: ['Kirby, Jack', 'false', 'Personal name'].join(''),
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: 'Contributors',
            from: undefined,
            to: ['Lee, Stan, 1922-2018', 'false', 'Comics creator,', 'Personal name'].join(''),
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: 'Contributors',
            from: undefined,
            to: ['Neilson, Donald, 1936-2011', 'false', 'Personal name'].join(''),
          },
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: 'Contributors',
            from: undefined,
            to: ['Acuña, Daniel', 'false', 'letterer.', 'Personal name'].join(''),
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: 'Contributors',
            from: ['Lee, Stan, 1922-2018', 'false', 'Creator', 'Personal name'].join(''),
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: 'Contributors',
            from: ['Kirby, Jack', 'false', 'Creator', 'Personal name'].join(''),
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: 'Subjects',
            from: ['Bandes dessinées de superhéros', 'Genre/form'].join(''),
            to: undefined,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: 'Subjects',
            from: ['Bandes dessinées', 'Genre/form'].join(''),
            to: undefined,
          },
        ];
        permissions = [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ];
        marcFile = {
          marc: 'marcBibFileC692081.mrc',
          fileName: `testMarcFileC692081_${randomPostfix}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        };

        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692081');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then((user) => {
            testData.adminLastName = user.personal.lastName;
            testData.adminFirstName = user.personal.firstName;

            [versionHistorySourceCardsData, versionHistoryViewCardsData].forEach(
              (cardData, index) => {
                if (index % 2) {
                  cardData.firstName = testData.adminFirstName;
                  cardData.lastName = testData.adminLastName;
                } else {
                  cardData.firstName = userProperties.firstName;
                  cardData.lastName = userProperties.lastName;
                }
              },
            );
          });

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;
            // Turn Version histoy feature on in case someone disabled it
            cy.enableVersionHistoryFeature(true);

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692081 Check "Version history" pane after CRUD multiple repeatable fields and subfields in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C692081'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          testData.addedFields.forEach((field) => {
            QuickMarcEditor.addEmptyFields(field.indexAbove);
            QuickMarcEditor.addValuesToExistingField(
              field.indexAbove,
              field.tag,
              field.content[2],
              field.content[0],
              field.content[1],
            );
            cy.wait(500);
          });
          testData.updatedFields.forEach((field) => {
            QuickMarcEditor.addValuesToExistingField(
              field.index - 1,
              field.tag,
              field.content[2],
              field.content[0],
              field.content[1],
            );
            cy.wait(500);
          });
          testData.deletedFields.forEach((field) => {
            QuickMarcEditor.deleteField(field.index);
            QuickMarcEditor.afterDeleteNotification(field.tag);
            cy.wait(500);
          });
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.constinueWithSaveAndCheckInstanceRecord();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistorySourceCardsData.length);
          versionHistorySourceCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });

          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          changesModalSourceData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalSourceData.length);
          VersionHistorySection.closeChangesModal();
          InventoryViewSource.close();
          InventoryInstance.waitLoading();

          InventoryInstance.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistoryViewCardsData.length);
          versionHistoryViewCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });

          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          changesModalViewData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalViewData.length);
        },
      );
    });
  });
});
