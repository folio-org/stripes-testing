import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const paneHeader = /Edit .*MARC record/;
      const instanceTitle = 'C451561Long. Live. A$AP [sound recording] / A$AP Rocky.';
      const contributorFieldValue = 'A$AP Rocky (Rapper), 1988-';
      const fieldValue = {
        tag: '246',
        newValue: '$a Long live A{dollar}AP',
      };
      const marcFile = {
        marc: 'marcBibFileForC451561.mrc',
        fileName: `testMarcFileC451561.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      let instanceId;
      const user = {};

      before('Create user, test data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.getUserToken(user.userProperties.username, user.userProperties.password);
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceId = record[marcFile.propertyName].id;
            });
          });
          cy.waitForAuthRefresh(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C850004 Edit "MARC bibliographic" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C850004'] },
        () => {
          // 1 Fill in the search query with title of imported record
          // Click on the "Search" button
          InventoryInstances.searchAndVerify(instanceTitle);
          InventoryInstance.waitInstanceRecordViewOpened(instanceTitle);
          InstanceRecordView.verifyResourceTitle(instanceTitle);
          InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(0, contributorFieldValue);

          // 2 Click on the "Action" button on the third pane >> Select "Edit MARC bibliographic record" option
          InstanceRecordView.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeader);
          QuickMarcEditor.checkContentByTag('100', '$a A{dollar}AP Rocky $c (Rapper), $d 1988-');
          QuickMarcEditor.checkContentByTag(
            '245',
            '$a C451561Long. Live. A{dollar}AP $h [sound recording] / $c A{dollar}AP Rocky.',
          );

          // 3 Edit "246" field
          QuickMarcEditor.updateExistingField(fieldValue.tag, fieldValue.newValue);
          QuickMarcEditor.checkContentByTag(fieldValue.tag, fieldValue.newValue);
          QuickMarcEditor.checkButtonsEnabled();

          // 4 Add new fields by clicking on "+" icon and fill it as specified
          QuickMarcEditor.addEmptyFields(18);
          QuickMarcEditor.addEmptyFields(19);
          QuickMarcEditor.addEmptyFields(20);
          cy.wait(1000);
          // QuickMarcEditor.addValuesToExistingField(18, '700', testData.field7XXOne);
          // QuickMarcEditor.addValuesToExistingField(19, '710', testData.field7XXTwo);
          // QuickMarcEditor.addValuesToExistingField(20, '711', testData.field7XXThree);

          // 5 Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkContentByTag('100', '$a A{dollar}AP Rocky $c (Rapper), $d 1988-');
          QuickMarcEditor.checkContentByTag(
            '245',
            '$a C451561Long. Live. A{dollar}AP $h [sound recording] / $c A{dollar}AP Rocky.',
          );
          QuickMarcEditor.checkContent('$a upper case first code test', 19);
          QuickMarcEditor.checkContentByTag('710', '$a upper case $b not First $c Code $d TEST');
          QuickMarcEditor.checkContentByTag('711', '$b A $a P $b p');
          cy.wait(3000);

          // 6 Close "quickMARC" pane
          QuickMarcEditor.pressCancel();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(paneHeader);
          InventoryInstance.waitInstanceRecordViewOpened(instanceTitle);
          InstanceRecordView.verifyResourceTitle(instanceTitle);
          InventoryInstance.verifyAlternativeTitle(0, 1, 'Long live A$AP');
          InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(0, contributorFieldValue);
        },
      );
    });
  });
});
