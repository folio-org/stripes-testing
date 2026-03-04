import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: 'C663316_Kafka, Franz, 1883-1924',
        searchOption: 'Keyword',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        ldrRegExp: /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/,
        addedFields: {
          field500First: {
            tag: '500',
            content: '$a Helen and Kurt Wolff papers $d field1',
            indicator0: '1',
            indicator1: '\\',
          },
          field500Second: {
            tag: '500',
            content: '$a Kurt Wolff archive $d field2',
            indicator0: '1',
            indicator1: '\\',
          },
        },
        updatedFields: {
          field400First: {
            newContent: '$a Kafqa, F. $d from 1883 to 1924',
          },
          field400Second: {
            newContent: '$a Kaphka, Ph.,',
          },
        },
      };

      const marcFile = {
        marc: 'marcAuthFileC663316.mrc',
        fileName: `testMarcFileC663316_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      };

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Kafka, Franz*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].authority.id;

            cy.login(testData.userProperties.username, testData.userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663316 Check "Version history" pane after Create, Update, Delete multiple repeatable field in "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663316'] },
        () => {
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.addedFields.field500First.tag,
            testData.addedFields.field500First.content,
            testData.addedFields.field500First.indicator0,
            testData.addedFields.field500First.indicator1,
          );
          cy.wait(500);

          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.addValuesToExistingField(
            5,
            testData.addedFields.field500Second.tag,
            testData.addedFields.field500Second.content,
            testData.addedFields.field500Second.indicator0,
            testData.addedFields.field500Second.indicator1,
          );
          cy.wait(500);

          QuickMarcEditor.updateExistingFieldContent(
            28,
            testData.updatedFields.field400First.newContent,
          );

          QuickMarcEditor.updateExistingFieldContent(
            29,
            testData.updatedFields.field400Second.newContent,
          );
          cy.wait(500);

          QuickMarcEditor.deleteField(46);
          QuickMarcEditor.deleteField(47);

          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeading);

          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );

          VersionHistorySection.checkChangeForCard(
            0,
            'Field 500',
            VersionHistorySection.fieldActions.ADDED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 400',
            VersionHistorySection.fieldActions.ADDED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field LDR',
            VersionHistorySection.fieldActions.EDITED,
          );
          VersionHistorySection.checkChangeForCard(
            0,
            'Field 400',
            VersionHistorySection.fieldActions.REMOVED,
          );

          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            '500',
            'No value set-',
            '1  $a Helen and Kurt Wolff papers $d field1',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            '500',
            'No value set-',
            '1  $a Kurt Wolff archive $d field2',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            '400',
            'No value set-',
            '1  $a Kaphka, Ph.,',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.ADDED,
            '400',
            'No value set-',
            '1  $a Kafqa, F. $d from 1883 to 1924',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.EDITED,
            'LDR',
            testData.ldrRegExp,
            testData.ldrRegExp,
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.REMOVED,
            '400',
            '1  $a Kʻapʻŭkʻa, $d 1883-1924',
            'No value set-',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.REMOVED,
            '400',
            '1  $a Ḳafḳa, Frants, $d 1883-1924',
            'No value set-',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.REMOVED,
            '400',
            '1  $a Kafka, Franz23, $d 1883-1924',
            'No value set-',
          );

          VersionHistorySection.checkChangeInModal(
            VersionHistorySection.fieldActions.REMOVED,
            '400',
            '1  $a Kafkā, Farānz,24 $d 1883-1924',
            'No value set-',
          );

          VersionHistorySection.checkChangesCountInModal(9);
        },
      );
    });
  });
});
