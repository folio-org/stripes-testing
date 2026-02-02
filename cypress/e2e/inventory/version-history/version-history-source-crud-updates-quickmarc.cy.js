import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import UsersCard from '../../../support/fragments/users/usersCard';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: 'AT_C692071_MarcBibInstance',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        addedField: {
          tag: '700',
          content: ['1', '\\', '$a Staceyann Chin $d 1972-'],
          indexAbove: 30,
        },
        updatedField: { tag: '240', content: ['2', '1', '$a Laws and Suits, etc.'] },
        deletedField: { tag: '260' },
        combinedUpdate: {
          addedField: {
            tag: '600',
            content: ['1', '\\', "$a Duck hunting $z duck's field"],
            indexAbove: 30,
          },
          updatedField: { tag: '110', content: ['\\', '\\', '$a California $b Bear.'] },
          deletedField: { index: 19 },
        },
        recordsEditorPath: '/records-editor/records*',
        ldrRegExp: /^\d{5}[a-zA-Z]{3}.{1}[a-zA-Z0-9]{8}.{3}4500$/,
      };
      const versionHistoryCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 600', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 110', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 650', action: VersionHistorySection.fieldActions.REMOVED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 260', action: VersionHistorySection.fieldActions.REMOVED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field 240', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field 700', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const changesModalsData = [
        [
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '600',
            from: undefined,
            to: "1  $a Duck hunting $z duck's field",
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: '110',
            from: '1  $a California. $e Duck.',
            to: '   $a California $b Bear.',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '650',
            from: ' 0 $a Game laws $z California.',
            to: undefined,
          },
        ],
        [
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '260',
            from: '   $a Sacramento : $b Dept. of Fish and Game, $c [1968]',
            to: undefined,
          },
        ],
        [
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: '240',
            from: '10 $a Laws, etc.',
            to: '21 $a Laws and Suits, etc.',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
        ],
        [
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '700',
            from: undefined,
            to: '1  $a Staceyann Chin $d 1972-',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
        ],
      ];
      const permissions = [
        Permissions.uiUsersView.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC692071.mrc',
        fileName: `testMarcFileC692071_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };
      let editorCallsCount = 0;

      function withWaitForEditor(callback) {
        cy.intercept({ method: 'GET', url: testData.recordsEditorPath }).as(
          `getRecord${editorCallsCount}`,
        );
        callback();
        QuickMarcEditor.closeAllCallouts();
        cy.wait(`@getRecord${editorCallsCount}`, { timeout: 5000 })
          .its('response.statusCode')
          .should('eq', 200);
        // wait for the rest of the calls - otherwise save buttons might not activate after next edit
        cy.wait(3000);
        editorCallsCount++;
      }

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692071');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then((user) => {
            testData.adminLastName = user.personal.lastName;
            testData.adminFirstName = user.personal.firstName;

            versionHistoryCardsData.forEach((cardData, index) => {
              if (index === versionHistoryCardsData.length - 1) {
                cardData.firstName = testData.adminFirstName;
                cardData.lastName = testData.adminLastName;
              } else {
                cardData.firstName = userProperties.firstName;
                cardData.lastName = userProperties.lastName;
              }
            });
          });

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;
            cy.enableVersionHistoryFeature(true);

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692071 Check "Version history" pane after CRUD field and subfield in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C692071'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addEmptyFields(testData.addedField.indexAbove);
          QuickMarcEditor.addValuesToExistingField(
            testData.addedField.indexAbove,
            testData.addedField.tag,
            testData.addedField.content[2],
            testData.addedField.content[0],
            testData.addedField.content[1],
          );
          withWaitForEditor(() => {
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
          });

          QuickMarcEditor.updateExistingField(
            testData.updatedField.tag,
            testData.updatedField.content[2],
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.updatedField.tag,
            testData.updatedField.content[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.updatedField.tag,
            testData.updatedField.content[1],
            1,
          );
          withWaitForEditor(() => {
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
          });

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.deletedField.tag);
          withWaitForEditor(() => {
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.confirmDelete();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
          });

          QuickMarcEditor.addEmptyFields(testData.combinedUpdate.addedField.indexAbove);
          QuickMarcEditor.addValuesToExistingField(
            testData.combinedUpdate.addedField.indexAbove,
            testData.combinedUpdate.addedField.tag,
            testData.combinedUpdate.addedField.content[2],
            testData.combinedUpdate.addedField.content[0],
            testData.combinedUpdate.addedField.content[1],
          );
          QuickMarcEditor.updateExistingField(
            testData.combinedUpdate.updatedField.tag,
            testData.combinedUpdate.updatedField.content[2],
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.combinedUpdate.updatedField.tag,
            testData.combinedUpdate.updatedField.content[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.combinedUpdate.updatedField.tag,
            testData.combinedUpdate.updatedField.content[1],
            1,
          );
          QuickMarcEditor.deleteField(testData.combinedUpdate.deletedField.index);
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(5);
          versionHistoryCardsData.forEach((cardData, index) => {
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

          changesModalsData.forEach((modalData, index) => {
            VersionHistorySection.openChangesForCard(index);
            VersionHistorySection.verifyChangesModal(
              testData.date,
              testData.userProperties.firstName,
              testData.userProperties.lastName,
            );
            modalData.forEach((change) => {
              VersionHistorySection.checkChangeInModal(...Object.values(change));
            });
            VersionHistorySection.checkChangesCountInModal(modalData.length);
            VersionHistorySection.closeChangesModal(index < 2);
          });
          VersionHistorySection.waitLoading();

          VersionHistorySection.clickOnSourceLinkInCard(0);
          UsersCard.verifyUserLastFirstNameInCard(
            testData.userProperties.lastName,
            testData.userProperties.firstName,
          );
        },
      );
    });
  });
});
