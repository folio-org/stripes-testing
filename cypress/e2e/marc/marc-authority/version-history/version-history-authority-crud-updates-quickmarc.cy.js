import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DateTools from '../../../../support/utils/dateTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: 'AT_C663309_MarcAuthority 1972-',
        authorityHeadingFinal: 'AT_C663309_MarcAuthority 1972- Crossfire: A Litany for Survival',
        searchOption: 'Keyword',
        tagLDR: 'LDR',
        tag010: '010',
        tag100: '100',
        tag372: '372',
        tag400: '400',
        tag500: '500',
        tag670: '670',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        addedField: {
          tag: '400',
          content: ['1', '\\', '$a Staceyann Chin'],
          indexAbove: 17,
        },
        updatedField: {
          tag: '100',
          content: [
            '1',
            '\\',
            '$a AT_C663309_MarcAuthority $d 1972- $t The Other Side of Paradise',
          ],
        },
        deletedField: { tag: '670', index: 15 },
        combinedUpdate: {
          addedField: {
            tag: '500',
            content: ['1', '\\', '$a Wildcat Woman (1998)'],
            indexAbove: 17,
          },
          updatedField: {
            tag: '100',
            content: [
              '1',
              '\\',
              '$a AT_C663309_MarcAuthority $d 1972- $t Crossfire: A Litany for Survival',
            ],
          },
          deletedField: { tag: '372' },
        },
        recordsEditorPath: '/records-editor/records*',
        ldrRegExp: /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/,
      };
      const versionHistoryCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 500', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 100', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 372', action: VersionHistorySection.fieldActions.REMOVED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 670', action: VersionHistorySection.fieldActions.REMOVED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field 100', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        {
          isOriginal: false,
          isCurrent: false,
          changes: [
            { text: 'Field 400', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const changesModalsData = [
        [
          {
            action: VersionHistorySection.fieldActions.ADDED,
            field: '500',
            from: undefined,
            to: '1  $a Wildcat Woman (1998)',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: '100',
            from: '1  $a AT_C663309_MarcAuthority $d 1972- $t The Other Side of Paradise',
            to: '1  $a AT_C663309_MarcAuthority $d 1972- $t Crossfire: A Litany for Survival',
          },
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: 'LDR',
            from: testData.ldrRegExp,
            to: testData.ldrRegExp,
          },
          {
            action: VersionHistorySection.fieldActions.REMOVED,
            field: '372',
            from: '   $a Spoken word poetry $a Gay rights $2 lcsh',
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
            field: '670',
            from: '   $a The other side of paradise, 2009: $b t.p. (Staceyann Chin) dataview (b. Dec. 25, 1972; spoken word poet and gay activist from Jamaica)',
            to: undefined,
          },
        ],
        [
          {
            action: VersionHistorySection.fieldActions.EDITED,
            field: '100',
            from: '1  $a AT_C663309_MarcAuthority $d 1972-',
            to: '1  $a AT_C663309_MarcAuthority $d 1972- $t The Other Side of Paradise',
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
            field: '400',
            from: undefined,
            to: '1  $a Staceyann Chin',
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
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcAuthFileC663309.mrc',
        fileName: `testMarcFileC663309_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C663309');

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
            testData.createdRecordId = response[0].authority.id;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663309 Check "Version history" pane after Create, Update, Delete field in "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C663309'] },
        () => {
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.edit();
          QuickMarcEditor.addEmptyFields(testData.addedField.indexAbove);
          QuickMarcEditor.addValuesToExistingField(
            testData.addedField.indexAbove,
            testData.addedField.tag,
            testData.addedField.content[2],
            testData.addedField.content[0],
            testData.addedField.content[1],
          );
          withWaitForEditor(() => {
            QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
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
            QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
          });

          QuickMarcEditor.deleteField(testData.deletedField.index);
          QuickMarcEditor.afterDeleteNotification(testData.deletedField.tag);
          withWaitForEditor(() => {
            QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
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
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.combinedUpdate.deletedField.tag);
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeadingFinal);

          MarcAuthority.clickVersionHistoryButton();
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
        },
      );
    });
  });
});
